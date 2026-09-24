import { command } from '$app/server';
import { env } from '$env/dynamic/private';
import { z } from 'zod';
import { requireUser } from './auth.remote';
import { serverLogger } from '$lib/server/logger';
import { getTeamOverview } from './team-overview.remote';
import { getPlayerSeasonAverages, getPlayerGameStats } from './player-game-stat.remote';
import { getGameBoxScore } from './game.remote';
import { getPlayer } from './player.remote';
import { getTeam } from './team.remote';
import { getDivision } from './division.remote';
import { getSeason } from './season.remote';
import { getOrganization } from './organization.remote';
import {
	AI_TASK,
	COACH_SYSTEM_PROMPT,
	ROTATION_GUIDE,
	STAT_GLOSSARY,
	WEBSITE_HELP_GUIDE,
} from '$lib/ai/prompts';
import { getFamilyPlayerHome } from './family.remote';
import { getCoachPlayerDetail } from './coach-player-stats.remote';
import { getPortalTeamContext } from './coach-portal.remote';
import { trueShootingPercentage } from '$lib/utils/collection';
import {
	averageGameRating,
	formatOfficialRatingBlock,
	ratingMeaning,
	type RatingBreakdown,
} from '$lib/stats/game-rating';
import { isPlayerPage, type AskAiAudience, type AskAiContextType } from '$lib/ai/context';
import {
	formatSeasonLeaderboards,
	formatSeasonPlayerLine,
	loadSeasonPlayerLines,
} from '$lib/server/season-player-directory.server';

const historyMessageSchema = z.object({
	role: z.enum(['user', 'assistant']),
	content: z.string().min(1).max(12000),
});

const audienceSchema = z.enum(['coach', 'player', 'organizer']);

const askAiContextSchema = z.object({
	type: z.enum(['team', 'player', 'game', 'season', 'family', 'general']),
	orgSlug: z.string().optional(),
	seasonSlug: z.string().optional(),
	divisionSlug: z.string().optional(),
	teamSlug: z.string().optional(),
	jerseyNumber: z.string().optional(),
	gameId: z.string().optional(),
	playerId: z.string().uuid().optional(),
	teamId: z.string().uuid().optional(),
	audience: audienceSchema.default('organizer'),
});

const askAiSchema = z.object({
	message: z.string().trim().min(1).max(2000),
	history: z.array(historyMessageSchema).max(20).default([]),
	context: askAiContextSchema,
});

function wrapTag(tag: string, content: string) {
	return `<${tag}>\n${content.trim()}\n</${tag}>`;
}

function audienceLabel(audience: AskAiAudience) {
	if (audience === 'coach') return 'coach';
	if (audience === 'player') return 'player or family';
	return 'league organizer';
}

function pushLineupRoster(
	parts: string[],
	players: { jerseyNumber: string; name: string; points: number; rebounds: number; assists: number; gamesPlayed: number }[]
) {
	parts.push(`Lineup roster (${players.length} players). Use only these names for starters, 6th man, and the rotation:`);
	for (const player of players) {
		parts.push(
			`- #${player.jerseyNumber} ${player.name}: ${player.points.toFixed(1)} PPG, ${player.rebounds.toFixed(1)} RPG, ${player.assists.toFixed(1)} APG (${player.gamesPlayed} GP)`
		);
	}
}

function pushOfficialRating(
	parts: string[],
	input: {
		playerName: string;
		rating: number | null;
		breakdown: RatingBreakdown | null;
		impactScore: number | null;
		percentile: number | null;
		contextBonus: number | null;
		points: number;
		rebounds: number;
		offensiveRebounds: number;
		assists: number;
		steals: number;
		blocks: number;
		turnovers: number;
		teamPoints: number | null;
		opponentPoints: number | null;
	}
) {
	if (
		input.rating == null ||
		input.breakdown == null ||
		input.impactScore == null ||
		input.percentile == null ||
		input.contextBonus == null
	) {
		return;
	}

	parts.push(
		formatOfficialRatingBlock({
			playerName: input.playerName,
			rating: input.rating,
			meaning: ratingMeaning(input.rating),
			impactScore: input.impactScore,
			percentile: input.percentile,
			contextBonus: input.contextBonus,
			breakdown: input.breakdown,
			points: input.points,
			rebounds: input.rebounds,
			offensiveRebounds: input.offensiveRebounds,
			assists: input.assists,
			steals: input.steals,
			blocks: input.blocks,
			turnovers: input.turnovers,
			teamPoints: input.teamPoints,
			opponentPoints: input.opponentPoints,
		})
	);
}

async function buildContextBlock(context: z.infer<typeof askAiContextSchema>) {
	const parts: string[] = [];
	const onPlayer = isPlayerPage(context.type as AskAiContextType);
	parts.push(`Viewer role: ${audienceLabel(context.audience)}.`);
	parts.push(
		onPlayer
			? 'This page is about one specific player. Answer stats questions for this player unless they name someone else in the league directory, or ask who leads a stat / for a top 10 list. Those leaderboard questions use the Top 10 lists.'
			: 'This page is not about one specific player. If the user asks for their stats without naming who, ask: Who should I pull the stats for? If they name a player, use the league directory. If they ask who leads a stat or for a top 10 list, use the Top 10 leaderboards.'
	);

	let seasonId: string | null = null;
	let focusDivisionName: string | null = null;

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
			seasonId = season.id;
			focusDivisionName = division.name;

			parts.push(`Team: ${team.name}`);
			parts.push(`Season: ${season.name}`);
			parts.push(`Division: ${division.name}`);
			parts.push(`Record: ${overview.record.wins}-${overview.record.losses}`);
			parts.push(`Rank: ${overview.rank ? `#${overview.rank}` : 'n/a'} of ${overview.teamsInDivision}`);
			if (overview.divisionPlace) parts.push(`Place: ${overview.divisionPlace}`);
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

			if (context.audience === 'coach') {
				pushLineupRoster(parts, overview.rosterAverages);
			} else {
				parts.push('Roster averages (PPG / RPG / APG):');
				for (const p of overview.rosterAverages.slice(0, 15)) {
					parts.push(
						`- #${p.jerseyNumber} ${p.name}: ${p.points.toFixed(1)} / ${p.rebounds.toFixed(1)} / ${p.assists.toFixed(1)} (${p.gamesPlayed} GP)`
					);
				}
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
			seasonId = season.id;
			focusDivisionName = division.name;
			const averages = await getPlayerSeasonAverages({ playerId: player.id });
			const games = await getPlayerGameStats({ playerId: player.id });

			parts.push(`Player: ${player.name} (#${player.jerseyNumber})`);
			parts.push(`Team: ${team.name}`);
			parts.push(`Season: ${season.name} · ${division.name}`);
			parts.push(`Games played: ${averages.gamesPlayed}`);
			parts.push(
				`Averages: ${averages.points.toFixed(1)} PPG, ${averages.rebounds.toFixed(1)} RPG, ${averages.assists.toFixed(1)} APG`
			);
			const ts = trueShootingPercentage(averages.points, averages.fga, averages.fta);
			parts.push(
				`Shooting: FG ${(averages.fgPct * 100).toFixed(1)}%, 3P ${(averages.fg3Pct * 100).toFixed(1)}%, FT ${(averages.ftPct * 100).toFixed(1)}%, True shooting % ${(ts * 100).toFixed(1)}%`
			);
			parts.push(
				'If they ask whether they are a good shooter, answer from these shooting percentages, especially true shooting %.'
			);

			if (games.length) {
				const average = averageGameRating(
					games.flatMap((game) => (game.gameRating == null ? [] : [game.gameRating]))
				);
				if (average != null) parts.push(`Average Game Rating: ${average.toFixed(1)}`);
				parts.push('Recent box scores:');
				for (const g of games.slice(0, 8)) {
					parts.push(
						`- ${g.game?.name ?? 'Game'}: ${g.pts} PTS, ${g.reb} REB, ${g.ast} AST, FG ${g.fgm}-${g.fga}`
					);
					pushOfficialRating(parts, {
						playerName: player.name,
						rating: g.gameRating,
						breakdown: g.ratingBreakdown,
						impactScore: g.impactScore,
						percentile: g.ratingPercentile,
						contextBonus: g.contextBonus,
						points: g.pts,
						rebounds: g.reb,
						offensiveRebounds: g.oreb,
						assists: g.ast,
						steals: g.stl,
						blocks: g.blk,
						turnovers: g.tov,
						teamPoints:
							g.game?.homeTeamId === team.id
								? g.game.homeTeamScore
								: g.game?.awayTeamId === team.id
									? g.game.awayTeamScore
									: null,
						opponentPoints:
							g.game?.homeTeamId === team.id
								? g.game.awayTeamScore
								: g.game?.awayTeamId === team.id
									? g.game.homeTeamScore
									: null,
					});
				}
			}
		}

		if (context.type === 'game' && context.gameId) {
			const box = await getGameBoxScore({ gameId: context.gameId });
			parts.push(`Game: ${box.awayTeam.name} ${box.awayTeam.score} – ${box.homeTeam.score} ${box.homeTeam.name}`);
			parts.push(
				'Team result is context only. It is not an input to the GameChanger Rating.'
			);
			for (const side of [box.awayTeam, box.homeTeam]) {
				const opponentScore = side.id === box.homeTeam.id ? box.awayTeam.score : box.homeTeam.score;
				parts.push(`${side.name} players:`);
				for (const p of side.players.slice(0, 12)) {
					parts.push(
						`- #${p.jerseyNumber} ${p.name}: ${p.pts} PTS, ${p.reb} REB, ${p.ast} AST, FG ${p.fgm}-${p.fga}`
					);
					pushOfficialRating(parts, {
						playerName: p.name,
						rating: p.gameRating,
						breakdown: p.ratingBreakdown,
						impactScore: p.impactScore,
						percentile: p.ratingPercentile,
						contextBonus: p.contextBonus,
						points: p.pts,
						rebounds: p.reb,
						offensiveRebounds: p.oreb,
						assists: p.ast,
						steals: p.stl,
						blocks: p.blk,
						turnovers: p.tov,
						teamPoints: side.score,
						opponentPoints: opponentScore,
					});
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
			seasonId = season.id;
		}

		if (context.type === 'player' && context.playerId && context.teamId && !context.jerseyNumber) {
			const detail = await getCoachPlayerDetail({
				teamId: context.teamId,
				playerId: context.playerId,
			});
			const summary = detail.summary;
			const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
			parts.push(`Player: ${detail.player.name} (#${detail.player.jerseyNumber})`);
			parts.push(`Team: ${detail.player.teamName}`);
			parts.push(`Games played: ${summary.gp}`);
			parts.push(
				`Per game: Points ${summary.ppg.toFixed(1)}, Rebounds ${summary.rpg.toFixed(1)}, Assists ${summary.apg.toFixed(1)}, Steals ${summary.spg.toFixed(1)}, Blocks ${summary.bpg.toFixed(1)}`
			);
			parts.push(
				`Shooting: FG% ${pct(summary.fgPct)}, 3P% ${pct(summary.fg3Pct)}, FT% ${pct(summary.ftPct)}`
			);
			if (summary.averageGameRating != null) {
				parts.push(`Average Game Rating: ${summary.averageGameRating.toFixed(1)}`);
			}
			for (const game of detail.gameLog.slice(0, 5)) {
				pushOfficialRating(parts, {
					playerName: detail.player.name,
					rating: game.gameRating,
					breakdown: game.breakdown,
					impactScore: game.impactScore,
					percentile: game.percentile,
					contextBonus: game.contextBonus,
					points: game.pts,
					rebounds: game.reb,
					offensiveRebounds: game.oreb,
					assists: game.ast,
					steals: game.stl,
					blocks: game.blk,
					turnovers: game.tov,
					teamPoints: game.teamScore,
					opponentPoints: game.oppScore,
				});
			}
			const portal = await getPortalTeamContext({ teamId: context.teamId });
			if (portal) {
				seasonId = portal.season.id;
				focusDivisionName = portal.division.name;
				if (context.audience === 'coach') {
					const overview = await getTeamOverview({
						teamId: context.teamId,
						divisionId: portal.division.id,
						seasonId: portal.season.id,
					});
					pushLineupRoster(parts, overview.rosterAverages);
				}
			}
		}

		if (context.type === 'team' && context.teamId && !context.teamSlug) {
			const portal = await getPortalTeamContext({ teamId: context.teamId });
			if (portal) {
				seasonId = portal.season.id;
				focusDivisionName = portal.division.name;
				const team = await getTeam({ id: context.teamId });
				const overview = await getTeamOverview({
					teamId: context.teamId,
					divisionId: portal.division.id,
					seasonId: portal.season.id,
				});
				parts.push(`Team: ${team.name}`);
				parts.push(`Season: ${portal.season.name}`);
				parts.push(`Division: ${portal.division.name}`);
				parts.push(`Record: ${overview.record.wins}-${overview.record.losses}`);
				if (overview.divisionPlace) parts.push(`Place: ${overview.divisionPlace}`);
				parts.push(`PPG: ${overview.ppg.toFixed(1)} | Opp PPG: ${overview.oppPpg.toFixed(1)}`);
				if (context.audience === 'coach') {
					pushLineupRoster(parts, overview.rosterAverages);
				} else {
					parts.push('Roster averages (PPG / RPG / APG):');
					for (const p of overview.rosterAverages.slice(0, 15)) {
						parts.push(
							`- #${p.jerseyNumber} ${p.name}: ${p.points.toFixed(1)} / ${p.rebounds.toFixed(1)} / ${p.assists.toFixed(1)} (${p.gamesPlayed} GP)`
						);
					}
				}
			}
		}

		if (context.type === 'family' && context.playerId) {
			const home = await getFamilyPlayerHome({ playerId: context.playerId });
			seasonId = home.player.seasonId;
			focusDivisionName = home.player.divisionName;
			const season = home.season;
			const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
			const ts = trueShootingPercentage(season.ppg, season.fga, season.fta);

			parts.push(`Player: ${home.player.name} (#${home.player.jerseyNumber})`);
			parts.push(`Team: ${home.player.teamName}`);
			parts.push(`Season: ${home.player.seasonName} · ${home.player.divisionName}`);
			parts.push(`Games played: ${season.gp}`);
			parts.push(
				`Per game: Points ${season.ppg.toFixed(1)}, Rebounds ${season.rpg.toFixed(1)}, Assists ${season.apg.toFixed(1)}, Steals ${season.spg.toFixed(1)}, Blocks ${season.bpg.toFixed(1)}`
			);
			parts.push(
				`Extra: Offensive rebounds ${season.orpg.toFixed(1)}, Defensive rebounds ${season.drpg.toFixed(1)}, Threes made ${season.fg3m.toFixed(1)}, Free throws made ${season.ftm.toFixed(1)}, Personal fouls ${season.pf.toFixed(1)}`
			);
			parts.push(
				`Shooting: FG% ${pct(season.fgPct)}, 3P% ${pct(season.fg3Pct)}, FT% ${pct(season.ftPct)}, True shooting % ${pct(ts)}`
			);
			parts.push(
				'If they ask whether they are a good shooter, answer from these shooting percentages, especially true shooting %.'
			);
			if (home.ratingSummary.average != null) {
				parts.push(`Average Game Rating: ${home.ratingSummary.average.toFixed(1)}`);
			}
			for (const game of home.recentGames) {
				pushOfficialRating(parts, {
					playerName: home.player.name,
					rating: game.gameRating,
					breakdown: game.breakdown,
					impactScore: game.impactScore,
					percentile: game.percentile,
					contextBonus: game.contextBonus,
					points: game.pts,
					rebounds: game.reb,
					offensiveRebounds: game.oreb,
					assists: game.ast,
					steals: game.stl,
					blocks: game.blk,
					turnovers: game.tov,
					teamPoints: null,
					opponentPoints: null,
				});
			}
		}

		if (context.type === 'general') {
			parts.push(
				'GameChanger tracks youth basketball: points, rebounds, assists, shooting percentages, steals, blocks, and turnovers from imported statsheets.'
			);
		}

		if (seasonId) {
			const directory = await loadSeasonPlayerLines(seasonId);
			parts.push('');
			parts.push(
				'League player directory (every player with games this season). Use this when they name another player, ask to pull someone up, or compare two players:'
			);
			for (const player of directory) {
				parts.push(formatSeasonPlayerLine(player, directory));
			}
			parts.push('');
			parts.push(formatSeasonLeaderboards(directory, focusDivisionName));
		}
	} catch (err) {
		serverLogger.error(err, 'failed building AI context');
		parts.push('Context data could not be fully loaded for this page.');
	}

	if (!parts.length) {
		parts.push('No page-specific stats are available.');
	}

	if (context.audience === 'coach') {
		parts.push('');
		parts.push(ROTATION_GUIDE.trim());
	}

	parts.push('');
	parts.push('Stat glossary:');
	parts.push(STAT_GLOSSARY.trim());
	parts.push('');
	parts.push('Website help:');
	parts.push(WEBSITE_HELP_GUIDE.trim());

	return parts.join('\n');
}

function getOpenAiConfig() {
	const apiKey = (env.OPENAI_API_KEY || env.OPEN_AI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
	const baseUrl = (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
	const model = env.OPENAI_MODEL || 'gpt-5-mini';
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

	const recentHistory = history.slice(-8).map((turn) => ({
		role: turn.role,
		content: turn.content.length > 1500 ? `${turn.content.slice(0, 1500)}…` : turn.content,
	}));

	const messages = [
		{ role: 'system' as const, content: systemPrompt },
		...recentHistory,
		{ role: 'user' as const, content: message },
	];

	try {
		// gpt-5 and o-series reject temperature and max_tokens.
		const reasoningModel = model.startsWith('gpt-5') || /^o\d/.test(model);
		const body = JSON.stringify(
			reasoningModel
				? {
						model,
						max_completion_tokens: 1000,
						reasoning_effort: 'minimal',
						messages,
					}
				: {
						model,
						temperature: 0.3,
						max_tokens: 700,
						messages,
					}
		);

		let response = await fetch(`${baseUrl}/chat/completions`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			body,
		});

		if (response.status === 429) {
			const errText = await response.text();
			const waitSeconds = Number(errText.match(/try again in ([0-9.]+)s/)?.[1] ?? 4);
			const waitMs = Math.min(Math.max(waitSeconds, 1), 12) * 1000;
			serverLogger.warn({ waitMs }, 'OpenAI rate limited, retrying once');
			await new Promise((resolve) => setTimeout(resolve, waitMs));
			response = await fetch(`${baseUrl}/chat/completions`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${apiKey}`,
					'Content-Type': 'application/json',
				},
				body,
			});
		}

		if (!response.ok) {
			const errText = await response.text();
			serverLogger.error({ status: response.status, errText }, 'OpenAI request failed');
			if (response.status === 429) {
				return {
					reply: 'The assistant is busy right now. Wait a few seconds and ask again.',
				};
			}
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
	askAiContextSchema.omit({ audience: true }),
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
			if (context.type === 'player' && context.playerId && context.teamId && !context.jerseyNumber) {
				const detail = await getCoachPlayerDetail({
					teamId: context.teamId,
					playerId: context.playerId,
				});
				return { label: detail.player.name };
			}
			if (context.type === 'team' && context.teamId && !context.teamSlug) {
				const team = await getTeam({ id: context.teamId });
				return { label: team.name };
			}
			if (context.type === 'family' && context.playerId) {
				const home = await getFamilyPlayerHome({ playerId: context.playerId });
				return { label: home.player.name };
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
