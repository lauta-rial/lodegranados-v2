# Migrations

This directory only tracks DB changes applied from 2026-07-01 onward (all
of them via the Supabase MCP directly against the remote project, never
committed as files until now). It does **not** capture the original base
schema — the 14 tables, their columns, indexes, or initial RLS policies
predate this directory and were never tracked as migrations either.

Running these against a truly empty Postgres database will fail (the base
tables don't exist yet). Reconstructing the full base schema as migrations
is a separate, larger task — out of scope for what these five files fix.
What these do guarantee: if you have a copy of the base schema (e.g. a
`pg_dump` of the current project, or `supabase db pull` against it), these
migrations are what's needed on top of it to reach the current state.
