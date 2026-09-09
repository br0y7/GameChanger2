import { command } from '$app/server';
import { env } from '$env/dynamic/private';
import { z } from 'zod';
import { requireUser } from './auth.remote';
import { db } from '$lib/server/db';
import { serverLogger } from '$lib/server/logger';
import { getTeamOverview } from './team-overview.remote';
import { getPlayerSeasonAverages, getPlayerGameStats } from './player-game-stat.remote';
import { getGameBoxScore } from './game.remote';
import { getPlayer } from './player.remote';
import { getTeam } from './team.remote';
import { getDivision } from './division.remote';
import { getSeason } from './season.remote';
import { getOrganization } from './organization.remote';
import { AI_TASK, COACH_SYSTEM_PROMPT } from '$lib/ai/prompts';

const historyMessageSchema = z.object({
	role: z.enum(['user', 'assistant']),
	content: z.string().min(1).max(4000),
});

const askAiSchema = z.object({
	message: z.string().trim().min(1).max(2000),
	history: z.array(historyMessageSchema).max(12).default([]),
	context: z.object({
		type: z.enum(['team', 'player', 'game', 'season', 'general']),
		orgSlug: z.string().optional(),
		seasonSlug: z.string().optional(),
		divisionSlug: z.string().optional(),
		teamSlug: z.string().optional(),
		jerseyNumber: z.string().optional(),
		gameId: z.string().optional(),
	}),
});

function wrapTag(tag: string, content: string) {
	return `<${tag}>\n${content.trim()}\n</${tag}>`;
}

async function buildContextBlock(context: z.infer<typeof askAiSchema>['context']) {
	const parts: string[] = [];

	try {
		if (context.type === 'team' && context.orgSlug && context.seasonSlug && context.divisionSlug && context.teamSlug) {
			const org = await getOrganization({ slug: context.orgSlug });
			const season = await getSeason({ slug: context.seasonSlug, organizationId: org.id });
			const division = await getDivision({ slug: context.divisionSlug, seasonId: season.id });
			const team = await getTeam({
				slug: context.teamSlug,
				divisionId: division.id,
				include: { players: true },
			});
			const overview = await getTeamOverview({
				teamId: team.id,
				divisionId: division.id,
				seasonId: season.id,
			});

			parts.push(`Team: ${team.name}`);
			parts.push(`Season: ${season.name}`);
			parts.push(`Division: ${division.name}`);
			parts.push(`Record: ${overview.record.wins}-${overview.record.losses}`);
			parts.push(`Rank: ${overview.rank ? `#${overview.rank}` : 'n/a'} of ${overview.teamsInDivision}`);
			parts.push(`PPG: ${overview.ppg.toFixed(1)} | Opp PPG: ${overview.oppPpg.toFixed(1)}`);
			if (overview.streak) parts.push(`Streak: ${overview.streak}`);

			parts.push('Leaders:');
			for (const leader of overview.leaders) {
				if (leader.player) {
					parts.push(
						`- ${leader.label}: ${leader.player.name} (#${leader.player.jerseyNumber}) ${leader.player.value.toFixed(1)} ${leader.suffix}`
					);
				}
			}

			parts.push('Roster averages (PPG / RPG / APG):');
			for (const p of overview.rosterAverages.slice(0, 15)) {
				parts.push(
					`- #${p.jerseyNumber} ${p.name}: ${p.points.toFixed(1)} / ${p.rebounds.toFixed(1)} / ${p.assists.toFixed(1)} (${p.gamesPlayed} GP)`
				);
			}

			if (overview.recentGames.length) {
				parts.push('Recent games:');
				for (const g of overview.recentGames) {
					parts.push(
						`- ${g.result} ${g.teamScore}-${g.oppScore} vs ${g.opponentName}`
					);
				}
			}
		}

		if (
			context.type === 'player' &&
			context.orgSlug &&
			context.seasonSlug &&
			context.divisionSlug &&
			context.teamSlug &&
			context.jerseyNumber
		) {
			const org = await getOrganization({ slug: context.orgSlug });
			const season = await getSeason({ slug: context.seasonSlug, organizationId: org.id });
			const division = await getDivision({ slug: context.divisionSlug, seasonId: season.id });
			const team = await getTeam({ slug: context.teamSlug, divisionId: division.id });
			const player = await getPlayer({ teamId: team.id, jerseyNumber: context.jerseyNumber });
			const averages = await getPlayerSeasonAverages({ playerId: player.id });
			const games = await getPlayerGameStats({ playerId: player.id });

			parts.push(`Player: ${player.name} (#${player.jerseyNumber})`);
			parts.push(`Team: ${team.name}`);
			parts.push(`Season: ${season.name} · ${division.name}`);
			parts.push(`Games played: ${averages.gamesPlayed}`);
			parts.push(
				`Averages: ${averages.points.toFixed(1)} PPG, ${averages.rebounds.toFixed(1)} RPG, ${averages.assists.toFixed(1)} APG`
			);
			parts.push(
				`Shooting: FG ${(averages.fgPct * 100).toFixed(0)}%, 3P ${(averages.fg3Pct * 100).toFixed(0)}%, FT ${(averages.ftPct * 100).toFixed(0)}%`
			);

			if (games.length) {
				parts.push('Recent box scores:');
				for (const g of games.slice(0, 8)) {
					parts.push(
						`- ${g.game?.name ?? 'Game'}: ${g.pts} PTS, ${g.reb} REB, ${g.ast} AST, FG ${g.fgm}-${g.fga}`
					);
				}
			}
		}

		if (context.type === 'game' && context.gameId) {
			const box = await getGameBoxScore({ gameId: context.gameId });
			parts.push(`Game: ${box.awayTeam.name} ${box.awayTeam.score} – ${box.homeTeam.score} ${box.homeTeam.name}`);
			for (const side of [box.awayTeam, box.homeTeam]) {
				parts.push(`${side.name} players:`);
				for (const p of side.players.slice(0, 12)) {
					parts.push(
						`- #${p.jerseyNumber} ${p.name}: ${p.pts} PTS, ${p.reb} REB, ${p.ast} AST, FG ${p.fgm}-${p.fga}`
					);
				}
			}
		}

		if (context.type === 'season' && context.orgSlug && context.seasonSlug) {
			const org = await getOrganization({ slug: context.orgSlug });
			const season = await getSeason({
				slug: context.seasonSlug,
				organizationId: org.id,
				include: { divisions: true },
			});
			parts.push(`Season: ${season.name}`);
			parts.push(`Organization: ${org.name}`);
			const divisions = season.divisions ?? [];
			parts.push(`Divisions: ${divisions.map((d) => d.name).join(', ') || 'none'}`);
		}

		if (context.type === 'general') {
			parts.push(
				'GameChanger tracks youth basketball: points, rebounds, assists, shooting percentages, steals, blocks, and turnovers from imported statsheets.'
			);
		}
	} catch (err) {
		serverLogger.error(err, 'failed building AI context');
		parts.push('Context data could not be fully loaded for this page.');
	}

	if (!parts.length) {
		parts.push('No page-specific stats are available.');
	}

	return parts.join('\n');
}

function getOpenAiConfig() {
	const apiKey = (env.OPENAI_API_KEY || env.OPEN_AI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
	const baseUrl = (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
	const model = env.OPENAI_MODEL || 'gpt-4o-mini';
	return { apiKey, baseUrl, model };
}

export const askAi = command(askAiSchema, async ({ message, history, context }) => {
	await requireUser();

	const { apiKey, baseUrl, model } = getOpenAiConfig();
	if (!apiKey) {
		return {
			reply:
				"AI isn't configured yet (missing API key). Stats insights will light up once that's set.",
		};
	}

	const contextBlock = await buildContextBlock(context);
	const systemPrompt = [
		COACH_SYSTEM_PROMPT,
		wrapTag('task', AI_TASK),
		wrapTag('context', contextBlock),
	].join('\n\n');

	const messages = [
		{ role: 'system' as const, content: systemPrompt },
		...history.slice(-6).map((m) => ({ role: m.role, content: m.content })),
		{ role: 'user' as const, content: message },
	];

	try {
		const response = await fetch(`${baseUrl}/chat/completions`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model,
				temperature: 0.7,
				messages,
			}),
		});

		if (!response.ok) {
			const errText = await response.text();
			serverLogger.error({ status: response.status, errText }, 'OpenAI request failed');
			return {
				reply: "I couldn't reach the coaching assistant just now. Try again in a moment.",
			};
		}

		const data = (await response.json()) as {
			choices?: { message?: { content?: string } }[];
		};
		const reply = data.choices?.[0]?.message?.content?.trim();

		return {
			reply: reply || "I don't see that in the data right now. What's our next play?",
		};
	} catch (err) {
		serverLogger.error(err, 'askAi failed');
		return {
			reply: "Something went wrong talking to the assistant. Let's try that again.",
		};
	}
});

/** Resolve a friendlier context label (e.g. real team name) for the panel header. */
export const getAskAiContextLabel = command(
	z.object({
		type: z.enum(['team', 'player', 'game', 'season', 'general']),
		orgSlug: z.string().optional(),
		seasonSlug: z.string().optional(),
		divisionSlug: z.string().optional(),
		teamSlug: z.string().optional(),
		jerseyNumber: z.string().optional(),
		gameId: z.string().optional(),
	}),
	async (context) => {
		await requireUser();
		try {
			if (
				context.type === 'team' &&
				context.orgSlug &&
				context.seasonSlug &&
				context.divisionSlug &&
				context.teamSlug
			) {
				const org = await getOrganization({ slug: context.orgSlug });
				const season = await getSeason({ slug: context.seasonSlug, organizationId: org.id });
				const division = await getDivision({ slug: context.divisionSlug, seasonId: season.id });
				const team = await getTeam({ slug: context.teamSlug, divisionId: division.id });
				return { label: team.name };
			}
			if (
				context.type === 'player' &&
				context.orgSlug &&
				context.seasonSlug &&
				context.divisionSlug &&
				context.teamSlug &&
				context.jerseyNumber
			) {
				const org = await getOrganization({ slug: context.orgSlug });
				const season = await getSeason({ slug: context.seasonSlug, organizationId: org.id });
				const division = await getDivision({ slug: context.divisionSlug, seasonId: season.id });
				const team = await getTeam({ slug: context.teamSlug, divisionId: division.id });
				const player = await getPlayer({ teamId: team.id, jerseyNumber: context.jerseyNumber });
				return { label: player.name };
			}
			if (context.type === 'game' && context.gameId) {
				const box = await getGameBoxScore({ gameId: context.gameId });
				return { label: `${box.awayTeam.name} vs ${box.homeTeam.name}` };
			}
		} catch {
			/* fall through */
		}
		return { label: null as string | null };
	}
);
