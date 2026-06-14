drop policy if exists "managers can update projects" on public.crm_projects;
drop policy if exists "authenticated users can update projects" on public.crm_projects;

create policy "authenticated users can update projects"
on public.crm_projects for update
to authenticated
using (true)
with check (true);
