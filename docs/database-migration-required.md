# Database Migration Required

## Important Note

Before using the enhanced prescription system, you need to apply the database migration:

### Migration File

`sql-scripts/19-enhanced-prescription-system.sql`

### What it creates:

1. **prescriptions table** - For structured prescription storage
2. **follow_up_date and follow_up_instructions columns** - Added to patient_visits table
3. **RLS policies** - For tenant-based security
4. **Indexes** - For better query performance

### How to Apply:

#### Option 1: Using Supabase CLI (Recommended)

```bash
cd /Users/andrewabishek/repos/CMS/clinic-management
supabase db reset  # This will apply all migrations including the new one
```

#### Option 2: Manual SQL Execution

```bash
# Connect to your Supabase database and run the SQL script manually
psql "your-database-connection-string" -f sql-scripts/19-enhanced-prescription-system.sql
```

#### Option 3: Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `sql-scripts/19-enhanced-prescription-system.sql`
4. Execute the script

### Verification

After applying the migration, verify that:

- [ ] `prescriptions` table exists
- [ ] `patient_visits` table has new follow-up columns
- [ ] RLS policies are active
- [ ] You can create and retrieve prescriptions

### Features Available After Migration:

- ✅ Structured prescription management
- ✅ Individual medicine entries
- ✅ Dosage and timing tracking
- ✅ PDF prescription generation
- ✅ Follow-up date management
- ✅ Professional prescription printing

The enhanced prescription system is ready to use once the database migration is applied!
