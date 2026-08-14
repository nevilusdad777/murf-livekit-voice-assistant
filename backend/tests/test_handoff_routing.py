import pytest
from livekit.agents import AgentSession, inference, llm
from agent import Assistant, MAIN_SYSTEM_PROMPT, SCHEME_SPECIALIST_PROMPT, LOAN_SPECIALIST_PROMPT


def _llm() -> llm.LLM:
    return inference.LLM(model="google/gemini-3.5-flash-lite")


@pytest.mark.asyncio
async def test_main_agent_normal_queries():
    """Verify normal queries stay with the main agent (Anisha)."""
    normal_queries = [
        "What are the transaction charges for credit card transfers?",
        "I lost my card and want to block it.",
        "What is the live exchange rate for USD to INR?",
        "What is the fee for sending money via UPI?",
    ]
    
    for query in normal_queries:
        async with (
            _llm() as llm_inst,
            AgentSession(llm=llm_inst) as session,
        ):
            await session.start(Assistant(instructions=MAIN_SYSTEM_PROMPT))
            result = await session.run(user_input=query)
            
            # Ensure the agent responds directly without transferring to a specialist
            await (
                result.expect.next_event()
                .is_message(role="assistant")
                .judge(
                    llm_inst,
                    intent="""
                    Answers the user's general payment, fee, or card blocking question directly as Anisha.
                    The agent should NOT say it is transferring to a specialist or call a transfer tool.
                    """,
                )
            )


@pytest.mark.asyncio
async def test_routing_to_scheme_specialist():
    """Verify government scheme queries route to the Scheme Specialist (Ankit)."""
    scheme_queries = [
        "Can you tell me about the PM-Svanidhi scheme for street vendors?",
        "What is PM Jan Dhan Yojana (PM-JDY) and what are its benefits?",
        "How do I get accident insurance under PM Suraksha Bima Yojana?",
    ]
    
    for query in scheme_queries:
        async with (
            _llm() as llm_inst,
            AgentSession(llm=llm_inst) as session,
        ):
            await session.start(Assistant(instructions=MAIN_SYSTEM_PROMPT))
            result = await session.run(user_input=query)
            
            # Verify that the main agent invokes transfer or announces transfer to Ankit
            await (
                result.expect.next_event()
                .is_message(role="assistant")
                .judge(
                    llm_inst,
                    intent="""
                    Recognizes that the question is about a government financial scheme and announces a transfer to the government scheme specialist (Ankit).
                    """,
                )
            )


@pytest.mark.asyncio
async def test_routing_to_loan_specialist():
    """Verify loan and credit queries route to the Loan Specialist (Rohan)."""
    loan_queries = [
        "What are the interest rates for a personal loan?",
        "How much credit limit can I get if my monthly income is 40,000?",
        "I want to apply for a business loan for my shop.",
    ]
    
    for query in loan_queries:
        async with (
            _llm() as llm_inst,
            AgentSession(llm=llm_inst) as session,
        ):
            await session.start(Assistant(instructions=MAIN_SYSTEM_PROMPT))
            result = await session.run(user_input=query)
            
            # Verify that the main agent invokes transfer or announces transfer to Rohan
            await (
                result.expect.next_event()
                .is_message(role="assistant")
                .judge(
                    llm_inst,
                    intent="""
                    Recognizes that the question is about loans or credit limits and announces a transfer to the loan specialist (Rohan).
                    """,
                )
            )


@pytest.mark.asyncio
async def test_specialist_handback_to_main():
    """Verify specialist hands back to main agent when topic changes to general support."""
    async with (
        _llm() as llm_inst,
        AgentSession(llm=llm_inst) as session,
    ):
        await session.start(Assistant(instructions=SCHEME_SPECIALIST_PROMPT))
        result = await session.run(user_input="Thank you for scheme details. Now can you tell me what the fee is for credit card transfers?")
        
        # Verify the specialist recognizes general support query and offers/announces transfer back
        await (
            result.expect.next_event()
            .is_message(role="assistant")
            .judge(
                llm_inst,
                intent="""
                Recognizes a general customer support request (transaction fees) and announces a transfer back to the main customer support assistant (Anisha).
                """,
            )
        )
