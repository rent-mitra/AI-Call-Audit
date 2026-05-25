from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from fastapi import Request, Response
from security.security import decode_token
from config import ACCESS_TOKEN_COOKIE_NAME

class JwtAuthenticationMiddleware(BaseHTTPMiddleware):
    """
    Stateless JWT middleware that intercepts incoming HTTP requests,
    extracts the token from HttpOnly cookies (preferred) or Bearer header,
    validates it, and stores the user context on `request.state.user`.
    """
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        token = None
        
        # 1. Try reading the access token from cookies
        if ACCESS_TOKEN_COOKIE_NAME in request.cookies:
            token = request.cookies[ACCESS_TOKEN_COOKIE_NAME]
            
        # 2. Fallback to Authorization Header
        if not token:
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header[len("Bearer "):]

        # 3. Decode & validate token, and attach user claims to request state
        request.state.user = None
        if token:
            claims = decode_token(token)
            if claims:
                # The claims structure: {"userId": ..., "role": ..., "sub": ..., "iat": ..., "exp": ...}
                request.state.user = {
                    "user_id": claims.get("userId"),
                    "email": claims.get("sub"),
                    "role": claims.get("role"),
                    "tenant_id": claims.get("tenantId"),
                    "tenant_name": claims.get("tenantName")
                }

        # 4. Proceed to the next middleware or router handler
        response = await call_next(request)
        return response
