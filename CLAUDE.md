# CLAUDE.md — Servfixy Tech App

## Project
Bilingual technician app (React Native / Expo). Part of the Servfixy platform for multifamily residential communities in Sun Belt markets.

## Stack
- Frontend: React Native / Expo
- Backend: Node/Express on Railway
- Database: Supabase (PostgreSQL)
- Secrets: Doppler
- Deployments: Vercel (frontends), Railway (backend)

## Rules
- NEVER ask the user to copy-paste code — push via GitHub API directly
- NEVER ALTER TABLE without explicitly flagging it first and asking James to run it in the Supabase SQL editor
- Always work one step at a time
- No Washington State properties — only use: Crestview at Midtown, Parkside at Memorial, The Addison at Westchase, Vela at Montrose, Ironwood at Clear Lake
- Never reference Brant Rock Apartments or Qualligy — company is always Servfixy
- Plan mode before any new feature or agent build
- No breaking changes to production without explicit approval
- Flag any security, auth, or payment-related changes immediately
- Preserve existing Doppler secret names — never hardcode credentials

## Architecture
- Six apps: Ops Dashboard, Owner Dashboard, Tech App (bilingual EN/ES), Resident Portal, Collections App, Backend API
- Agentic AI: Collections Risk Agent, Service Workflow Agent, Dual-Agent Consensus Layer, Revenue Domain agent
- PMS connectors: AppFolio, ResMan, Entrata, RealPage, Yardi

## Active Properties
1. Crestview at Midtown
2. Parkside at Memorial
3. The Addison at Westchase
4. Vela at Montrose
5. Ironwood at Clear Lake

## Key Contacts
- James (CEO/Co-founder) — product decisions, architecture approval
- Courtney Hill (Co-founder) — operations

## Priorities
1. No breaking changes to production without explicit approval
2. Flag security, auth, or payment-related changes immediately
3. Preserve Doppler secret names — never hardcode credentials
4. AI augments human judgment — never replaces it
