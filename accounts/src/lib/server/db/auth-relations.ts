import { defineRelations } from 'drizzle-orm';
import * as schema from './auth-schema';

export const authRelations = defineRelations(schema, (r) => ({
	user: {
		sessions: r.many.session(),
		accounts: r.many.account(),
		teamMembers: r.many.teamMember(),
		members: r.many.teamMember(),
		invitations: r.many.invitation(),
	},
	session: {
		user: r.one.user({
			from: [r.session.userId],
			to: [r.user.id],
		}),
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
}));
