# Company Task Manager

## Current State
Admin role is stored in a stable map (`adminPrincipals`) and synced to MixinAuthorization on postupgrade. However, full redeployments wipe stable state, causing repeated admin loss.

## Requested Changes (Diff)

### Add
- Hardcoded permanent admin principal: `jzvyy-b5vuw-oekmq-hiij4-sjcsk-s77ci-uu4i3-ldknd-qk5cl-a322x-sqe`

### Modify
- `isAdminPrincipal` to always return true for the hardcoded principal ID, regardless of stable state
- `bootstrapAdmin` to always succeed for the hardcoded principal
- `postupgrade` to always re-add the hardcoded principal to admin stores

### Remove
- Nothing

## Implementation Plan
1. Add a constant for the permanent admin principal
2. Update `isAdminPrincipal` to check against this constant first
3. Update `postupgrade` to always register the hardcoded principal as admin
4. Update `bootstrapAdmin` to always allow the hardcoded principal to claim admin
