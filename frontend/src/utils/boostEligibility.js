/**
 * Checks if a player can be assigned to a specific boost role based on eligibility rules.
 *
 * @param {object} player - The player object (should have a 'role' property like 'BAT', 'BOWL', 'ALL', 'WK').
 * @param {object} boostRole - The boost role object (should have an 'allowed_player_types' array property).
 * @returns {boolean} - True if the player is eligible, false otherwise.
 */
export const canAssignPlayerToRole = (player, boostRole) => {
  if (!player || !boostRole) {
    console.warn("canAssignPlayerToRole: Missing player or boostRole object.");
    return false;
  }

  // If allowed_player_types is missing or empty, assume any player is eligible for safety.
  // Adjust this logic if roles MUST have restrictions.
  if (!boostRole.allowed_player_types || boostRole.allowed_player_types.length === 0) {
    // console.warn(`Boost role "${boostRole.name}" has no defined allowed_player_types. Assuming eligible.`);
    return true;
  }

  // Check if the player's role is included in the allowed types for the boost role.
  return boostRole.allowed_player_types.includes(player.role);
};

// Example Usage (can be removed):
/*
const samplePlayerBAT = { id: 1, name: "Virat Kohli", role: "BAT" };
const samplePlayerBOWL = { id: 2, name: "Jasprit Bumrah", role: "BOWL" };
const samplePlayerALL = { id: 3, name: "Hardik Pandya", role: "ALL" };
const samplePlayerWK = { id: 4, name: "Rishabh Pant", role: "WK" };

const sampleRoleSlogger = { id: 3, name: "Slogger", allowed_player_types: ["BAT", "ALL"] };
const sampleRoleRattler = { id: 6, name: "Rattler", allowed_player_types: ["BOWL"] };
const sampleRoleAny = { id: 9, name: "Any Player Role", allowed_player_types: [] }; // Example for any player

console.log("Kohli for Slogger?", canAssignPlayerToRole(samplePlayerBAT, sampleRoleSlogger)); // true
console.log("Bumrah for Slogger?", canAssignPlayerToRole(samplePlayerBOWL, sampleRoleSlogger)); // false
console.log("Bumrah for Rattler?", canAssignPlayerToRole(samplePlayerBOWL, sampleRoleRattler)); // true
console.log("Pandya for Slogger?", canAssignPlayerToRole(samplePlayerALL, sampleRoleSlogger)); // true
console.log("Pant for Slogger?", canAssignPlayerToRole(samplePlayerWK, sampleRoleSlogger)); // false
console.log("Kohli for AnyRole?", canAssignPlayerToRole(samplePlayerBAT, sampleRoleAny)); // true
*/
