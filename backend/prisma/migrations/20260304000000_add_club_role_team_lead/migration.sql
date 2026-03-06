-- Roles are derived from ClubMembership only; never store role on User.
ALTER TYPE "club_role" ADD VALUE 'team_lead';
