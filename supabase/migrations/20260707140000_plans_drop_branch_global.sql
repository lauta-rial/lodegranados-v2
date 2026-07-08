-- Plans are company-wide now (Club DeVinos is one catalogue for the whole
-- chain, superadmin-managed). A plan no longer belongs to a branch — which
-- branch a *subscription* belongs to is now carried on the subscription
-- itself (sourced from the signup branch via the MP preapproval's
-- external_reference), not inherited from the plan.
alter table plans drop column if exists branch_id;
