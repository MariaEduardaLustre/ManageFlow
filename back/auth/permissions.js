// auth/permissions.js
const MAP = {
  dashboard:   { ADM:['view'], STAF:['view'], ANALYST:['view'], CUSTOMER:['view'] },
  queues:      { ADM:['create','view','edit','reorder','clear','delete'], STAF:['create','view','edit','reorder','clear'], ANALYST:['view'], CUSTOMER:['view'] },
  queueEntries:{ ADM:['create','view','edit','transfer','clear','delete'], STAF:['create','view','edit','transfer','clear','delete'], ANALYST:['view'], CUSTOMER:['checkin','view','delete'] },
  usersRoles:  { ADM:['create','edit','delete','view'], STAF:[], ANALYST:[], CUSTOMER:[] },
  analytics:   { ADM:['view'], STAF:['reports_own'], ANALYST:['reports_own'], CUSTOMER:[] },
  settings:    { ADM:['view','edit'], STAF:['view'], ANALYST:[], CUSTOMER:[] },
  reviews:     { ADM:['view','respond','delete'], STAF:['view'], ANALYST:['view'], CUSTOMER:['create','view'] },
};

function can(role, action, resource) {
  const r = MAP[resource]; if (!r) return false;
  return (r[role] || []).includes(action);
}
module.exports = { MAP, can };
