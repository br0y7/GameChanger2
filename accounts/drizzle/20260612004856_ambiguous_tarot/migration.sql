DROP INDEX IF EXISTS `oauthAccessToken_clientId_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `oauthAccessToken_sessionId_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `oauthAccessToken_userId_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `oauthAccessToken_refreshId_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `oauthClient_userId_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `oauthConsent_clientId_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `oauthConsent_userId_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `oauthRefreshToken_clientId_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `oauthRefreshToken_sessionId_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `oauthRefreshToken_userId_idx`;--> statement-breakpoint
DROP TABLE `jwks`;--> statement-breakpoint
DROP TABLE `oauth_access_token`;--> statement-breakpoint
DROP TABLE `oauth_client`;--> statement-breakpoint
DROP TABLE `oauth_consent`;--> statement-breakpoint
DROP TABLE `oauth_refresh_token`;