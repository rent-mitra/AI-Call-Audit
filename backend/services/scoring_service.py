def calculate_final_score(ai_results: list, qa_parameters: list):
    """
    Applies the strict pass/fail logic to the AI evaluation results.
    
    Returns: (final_status, total_score, mandatory_failed)
    """
    total_possible_marks = 0
    total_obtained_marks = 0
    mandatory_failed = False
    
    # Create a quick lookup for parameter config
    param_lookup = {p.category: p for p in qa_parameters}

    for res in ai_results:
        param_config = param_lookup.get(res.get("parameter"))
        if not param_config:
            continue
            
        total_possible_marks += param_config.marks
        # Cap obtained marks between 0 and max marks to avoid score > 100%
        obtained_marks = max(0, min(res.get("marks_obtained", 0), param_config.marks))
        total_obtained_marks += obtained_marks
        
        # Check mandatory failure
        if param_config.mandatory and res.get("status") == "Failed":
            mandatory_failed = True

    # Calculate percentage
    if total_possible_marks == 0:
        score_percentage = 0
    else:
        score_percentage = (total_obtained_marks / total_possible_marks) * 100
        score_percentage = min(100, max(0, score_percentage))

    # Apply Rules
    # Score >= 80% AND no mandatory failure -> Passed
    # Score 60-79% AND no mandatory failure -> Needs Manual Review
    # Score < 60% -> Failed
    # ANY mandatory failure -> Failed
    
    if mandatory_failed:
        final_status = "FAILED"
    elif score_percentage < 60:
        final_status = "FAILED"
    elif score_percentage >= 80:
        final_status = "PASSED"
    else:
        final_status = "NEEDS_REVIEW"
        
    return final_status, int(score_percentage), mandatory_failed
