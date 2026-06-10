import { defineRelations } from 'drizzle-orm';
import * as schema from './auth-schema';

export const authRelations = defineRelations(schema, (r) => ({
	user: {
		sessions: r.many.session(),
		accounts: r.many.account(),
		teamMembers: r.many.teamMember(),
		members: r.many.teamMember(),
		invitations: r.many.invitation(),
		oauthClients: r.many.oauthClient(),
		oauthRefreshTokens: r.many.oauthRefreshToken(),
		oauthAccessTokens: r.many.oauthAccessToken(),
		oauthConsents: r.many.oauthConsent(),
	},
	session: {
		user: r.one.user({
			from: [r.session.userId],
			to: [r.user.id],
		}),
		oauthRefreshTokens: r.many.oauthRefreshToken(),
		oauthAccessTokens: r.many.oauthAccessToken(),
	},
	account: {
		user: r.one.user({
			from: [r.account.userId],
			to: [r.user.id],
		}),
	},
	organization: {
		team: r.many.team(),
		member: r.many.member(),
		invitation: r.many.invitation(),
	},
	team: {
		organization: r.one.organization({
			from: [r.team.organizationId],
			to: [r.organization.id],
		}),
		teamMember: r.many.teamMember(),
	},
	teamMember: {
		team: r.one.team({
			from: [r.teamMember.id],
			to: [r.team.id],
		}),
		user: r.one.user({
			from: [r.teamMember.id],
			to: [r.user.id],
		}),
	},
	member: {
		organization: r.one.organization({
			from: [r.member.organizationId],
			to: [r.organization.id],
		}),
		user: r.one.user({
			from: [r.member.userId],
			to: [r.user.id],
		}),
	},
	invitation: {
		organization: r.one.organization({
			from: [r.invitation.organizationId],
			to: [r.organization.id],
		}),
		user: r.one.user({
			from: [r.invitation.inviterId],
			to: [r.user.id],
		}),
	},
	oauthClient: {
		user: r.one.user({
			from: [r.oauthClient.userId],
			to: [r.user.id],
		}),
		oauthRefreshTokens: r.many.oauthRefreshToken(),
		oauthAccessTokens: r.many.oauthAccessToken(),
		oauthConsents: r.many.oauthConsent(),
	},
	oauthRefreshToken: {
		oauthClient: r.one.oauthClient({
			from: [r.oauthRefreshToken.clientId],
			to: [r.oauthClient.id],
		}),
		session: r.one.session({
			from: [r.oauthRefreshToken.sessionId],
			to: [r.session.id],
		}),
		user: r.one.user({
			from: [r.oauthRefreshToken.userId],
			to: [r.user.id],
		}),
		oauthAccessTokens: r.many.oauthAccessToken(),
	},
	oauthAccessToken: {
		oauthClient: r.one.oauthClient({
			from: [r.oauthAccessToken.clientId],
			to: [r.oauthClient.id],
		}),
		session: r.one.session({
			from: [r.oauthAccessToken.sessionId],
			to: [r.session.id],
		}),
		user: r.one.user({
			from: [r.oauthAccessToken.userId],
			to: [r.user.id],
		}),
		oauthRefreshToken: r.one.oauthRefreshToken({
			from: [r.oauthAccessToken.refreshId],
			to: [r.oauthRefreshToken.id],
		}),
	},
	oauthConsent: {
		oauthClient: r.one.oauthClient({
			from: [r.oauthConsent.clientId],
			to: [r.oauthClient.id],
		}),
		user: r.one.user({
			from: [r.oauthConsent.userId],
			to: [r.user.id],
		}),
	},
}));
