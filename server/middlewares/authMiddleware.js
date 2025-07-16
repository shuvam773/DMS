const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
    let token;
    let authHeader = req.headers.Authorization || req.headers.authorization;

    if(authHeader && authHeader.startsWith("Bearer")) {
        token = authHeader.split(" ")[1];
        
        if(!token) {
            return res.status(401).json({message: "No token, authorization denied"});
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Make sure this matches how you created the token
            req.user = {
                id: decoded.userId,       // This is crucial
                role: decoded.role,
                email: decoded.email
            };
            
            console.log("Decoded user:", req.user); // Debug log
            next();

        } catch (err) {
            console.error("Token verification error:", err);
            return res.status(401).json({message: "Token is not valid"});
        }
    } else {
        return res.status(401).json({message: "No token, authorization denied"});
    }
}

module.exports = verifyToken;