# 🧪 NFA — Demo Dummy Users (Cheat Sheet)

Test workers pre-loaded in the **Datalake 3.0 registry** (`data_lake_3.db`). Use these exact
**4 fields** to onboard / verify a worker in the NFA app, then do a one-time face registration and punch.

> **How to use in the app:** *Login as Worker* → enter **First name, Last name, Mobile, Email** exactly as
> below → the app verifies against the registry & issues a JWT → register your face (3 guided poses, one-time)
> → punch in / out (fully offline). Onboarding matches all 4 fields, so type them exactly.

- **Face enrolled = ✅** → a face is already bound to this worker (needs that person's live face to punch).
- **Face enrolled = ⬜** → fresh worker — best for demoing the full onboarding → face-register → punch flow.

| # | First name | Last name | Mobile | Email | Face enrolled |
|--:|------------|-----------|--------|-------|:-------------:|
| 1 | Aman | Chandel | `7535033481` | `amanchandel.anee@gmail.com` | ✅ |
| 2 | Amit | Singh | `9911223344` | `amit.singh@example.com` | ✅ |
| 3 | Rajesh | Kumar | `9876543210` | `rajesh.kumar@example.com` | ✅ |
| 4 | Sahil | Chandel | `9717891203` | `aineuron.anee@gmail.com` | ✅ |
| 5 | Akash | Chandel | `9012700601` | `akashchandel.anee@gmail.com` | ⬜ |
| 6 | Anjali | Gupta | `9870011223` | `anjali.gupta@example.com` | ⬜ |
| 7 | Deepak | Verma | `9812345678` | `deepak.verma@example.com` | ⬜ |
| 8 | Kavita | Joshi | `9701234567` | `kavita.joshi@example.com` | ⬜ |
| 9 | Meena | Reddy | `9090909090` | `meena.reddy@example.com` | ⬜ |
| 10 | Priya | Sharma | `9823456781` | `priya.sharma@example.com` | ⬜ |
| 11 | Sunita | Devi | `9765432109` | `sunita.devi@example.com` | ⬜ |
| 12 | Suresh | Yadav | `9123456780` | `suresh.yadav@example.com` | ⬜ |
| 13 | Vikram | Patel | `9988776655` | `vikram.patel@example.com` | ⬜ |

**Total: 13 workers** · 4 with a face already enrolled · 9 fresh.

> ⚠️ These are **dummy test users** for NHAI Hackathon 7.0 evaluation only. Not real personnel.
> The registry DB itself is not shipped publicly; this sheet lists only the demo-login fields.
