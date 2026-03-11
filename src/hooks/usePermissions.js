import { useMemo } from 'react';

/**
 * Hook to manage and check permissions for the current user.
 * 
 * @param {Object} user - The authenticated user object from InstantDB hook.
 * @param {Object} profile - The user profile (either the owner's or the team member's owner's).
 * @param {Array} teamMembers - List of team members for the owner.
 */
export function usePermissions(user, profile, teamMembers = []) {
  const permissions = useMemo(() => {
    if (!user || !profile) return null;

    // 1. Check if user is a Team Member (Priority)
    const member = teamMembers.find(m => m.email.toLowerCase() === user.email?.toLowerCase());

    // 2. Check if user is the Owner
    const isOwnerByEmail = user.email && profile.email && user.email.toLowerCase() === profile.email.toLowerCase();
    const isOwnerById = user.id === profile.userId;
    const isOwner = (isOwnerByEmail || isOwnerById) && !member; // Only owner if NOT a member
    
    if (isOwner) {
      return { isOwner: true, can: () => true, modules: null, name: profile.fullName };
    }

    if (!member || member.active === false) {
      return { isOwner: false, can: () => false, modules: {} };
    }

    // 3. Resolve Role Permissions
    const roles = profile.roles || [];
    const roleMatch = roles.find(r => r.name === member.role);
    
    if (!roleMatch) {
      return { isOwner: false, can: () => false, modules: {} };
    }

    // Normalise perms (handling both old string[] and new object formats)
    let perms = roleMatch.perms || {};
    if (Array.isArray(perms)) {
      // old format: ["Leads"] -> only grant 'view' and 'list' by default for safety
      perms = Object.fromEntries(perms.map(module => [module, ['view', 'list']]));
    }

    /**
     * [HARDCODED SECURITY OVERRIDE]
     * For Team Members: We strictly revoke Admin/Manager status and block sensitive modules.
     * This overrides any role-based configurations in the database.
     */
    const isAdmin = false;    // Hard-revoked
    const isManager = false;  // Hard-revoked
    const BLOCKED_MODULES = ['Admin', 'Settings', 'Teams']; // Strictly block Teams for members

    // 4. Trace Permissions (Diagnostic)
    const trace = (module, action, result, reason) => {
        if (typeof window !== 'undefined' && window.DEBUG_PERMS) {
            console.log(`[Perms] ${module}:${action} -> ${result} (${reason})`);
        }
    };

    return {
      isOwner: false,
      role: member.role,
      isAdmin,
      isManager,
      name: member.name,
      modules: perms,
      /**
       * Check if user can perform an action on a module.
       * Strictly returns true or false.
       */
      can: (module, action = 'list') => {
        // Hard-block sensitive modules for ALL team members
        if (BLOCKED_MODULES.includes(module)) {
            trace(module, action, false, 'Hard-blocked module');
            return false;
        }

        const modPerms = perms[module];
        
        // If no permissions defined for this module, deny all
        if (!modPerms || !Array.isArray(modPerms)) {
            trace(module, action, false, 'No permissions defined');
            return false;
        }

        // 'view' is true if they have any permission for the module
        if (action === 'view') {
            const hasAny = modPerms.length > 0;
            trace(module, action, hasAny, hasAny ? 'Has granular perms' : 'Empty perms array');
            return hasAny;
        }

        const hasAction = modPerms.includes(action);
        trace(module, action, hasAction, hasAction ? 'Action found in array' : 'Action missing from array');
        return hasAction;
      }
    };
  }, [user, profile, teamMembers]);

  return permissions;
}
