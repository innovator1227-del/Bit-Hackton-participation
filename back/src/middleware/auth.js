const jwt = require("jsonwebtoken");
const { User } = require("../db/models");

async function authenticate(req, res, next) {
  const token = req.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token)
    return res.status(401).json({
      error: { code: "AUTH_REQUIRED", message: "Sign in to continue." },
    });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ id: Number(payload.sub) })
      .select("id name email role is_active -_id")
      .lean();
    if (!user || !user.is_active)
      return res.status(401).json({
        error: {
          code: "INVALID_SESSION",
          message: "This account is unavailable.",
        },
      });
    req.user = user;
    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        error: {
          code: "INVALID_TOKEN",
          message: "Your session is invalid or expired.",
        },
      });
    }
    next(error);
  }
}

function optionalAuthenticate(req, res, next) {
  if (!req.get("authorization")) return next();
  return authenticate(req, res, next);
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to do this.",
        },
      });
    }
    next();
  };
}

module.exports = { authenticate, optionalAuthenticate, allowRoles };
