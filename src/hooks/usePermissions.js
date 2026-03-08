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

    // 1. Check if user is the Owner
    const isOwner = user.id === profile.userId || 
                    (user.email && profile.email && user.email.toLowerCase() === profile.email.toLowerCase());
    
    if (isOwner) {
      return { isOwner: true, can: () => true, modules: null, name: profile.fullName };
    }

    // 2. Check if user is a Team Member
    const member = teamMembers.find(m => m.email.toLowerCase() === user.email?.toLowerCase());
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
      // Convert old format to new format on the fly for consistency
      perms = Object.fromEntries(perms.map(module => [module, ['view', 'list', 'create', 'edit', 'delete']]));
    }

    return {
      isOwner: false,
      role: member.role,
      name: member.name,
      modules: perms,
      /**
       * Check if user can perform an action on a module.
       * @param {string} module - Module key (e.g., 'Leads', 'AMC')
       * @param {string} action - Action key (e.g., 'list', 'create', 'edit', 'delete', 'view')
       */
      can: (module, action = 'list') => {
        const modPerms = perms[module];
        if (!modPerms) return false;
        // 'view' is often an alias for 'list' or a general access check
        if (action === 'view') return modPerms.length > 0;
        return modPerms.includes(action);
      }
    };
  }, [user, profile, teamMembers]);

  return permissions;
}
