const authController = {};
const pool = require('../database/database.js');
const log = require("loglevel");




/* ________________________________________________________________________
 * Checks user access privileges
 * ________________________________________________________________________
*/

authController.checkAccess = (role) => {
    return async (req, res, next) => {
    const walletId = res.locals.wallet_id;
    const query = {
      text: `SELECT *
      FROM entity_role
      WHERE entity_id = $1
      AND role_name = $2
      AND enabled = TRUE`,
      values: [walletId, role]
    };
    const rval = await pool.query(query);

    if (rval.rows.length !== 1) {
      log.debug("check access fail...", walletId, role);
      next({
        log: `ERROR: Permission for ${role} not granted`,
        status: 401,
        message: { err: `ERROR: Permission to ${role} not granted`},
      });
    }
    next();
  }
};

module.exports = authController;
