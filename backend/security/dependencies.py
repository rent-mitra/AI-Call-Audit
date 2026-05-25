from fastapi import Request, HTTPException, Depends
from typing import List

def get_current_user(request: Request) -> dict:
    """
    Stateless dependency to retrieve the currently authenticated user
    from request state context (populated by JwtAuthenticationMiddleware).
    """
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Authentication credentials were not provided or are invalid."
        )
    return user

class RoleChecker:
    """
    Role authorization checker that implements RBAC validation dynamically.
    """
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: dict = Depends(get_current_user)) -> dict:
        user_role = current_user.get("role")
        if user_role not in self.allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required role: {', '.join(self.allowed_roles)}"
            )
        return current_user

# Pre-defined role dependencies for clean routing decorators
require_admin = RoleChecker(["ADMIN"])
require_qa = RoleChecker(["QA"])
require_agent = RoleChecker(["AGENT"])
require_qa_or_agent = RoleChecker(["QA", "AGENT"])
