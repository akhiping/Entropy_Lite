# ⚠️ Entropy – Project Constraints & Technical Challenges

This document outlines the known technical and architectural constraints of Entropy as of the current MVP. These limitations guide product design, set user expectations, and frame future development efforts.

---

## 1. Platform Isolation (ChatGPT is a Closed System)
- Entropy cannot access, modify, or sync with OpenAI's main ChatGPT conversation memory.
- Each “branch” is its own API-based session.
- Workaround: Entropy maintains parallel memory per branch.

## 2. Dual Contexts: Main vs Branches
- Branches run on OpenAI API calls via user key.
- The main thread is handled by OpenAI’s web UI backend.
- Mitigation: Each branch stores its own full conversation history.

## 3. API Key Security
- Users must provide their own OpenAI API key.
- Risks include accidental exposure or abuse.
- Stored locally via `chrome.storage` with no cloud sync.

## 4. Local-Only Persistence
- No built-in cloud sync; all data is local.
- If storage is cleared, all branches are lost.
- Future: Export/import support, Gist sync, or cloud backup.

## 5. UI Injection Complexity
- Injecting UI into ChatGPT’s DOM is prone to conflict with OpenAI’s updates.
- Shadow DOM usage may break selectors.
- Styling isolation and graceful degradation are required.

## 6. Token & Cost Management
- Each branch consumes tokens independently.
- No automatic memory sharing across threads.
- Token usage optimization (history trimming) is essential for cost control.

## 7. Gravitate is a Virtual Switch
- “Main thread promotion” is purely visual/logical.
- The original ChatGPT thread remains unchanged.
- Internally, a `mainBranchId` pointer manages session priority.

## 8. Experimental UX Paradigm
- Users are unfamiliar with sticky chat branching models.
- There’s potential for UI overwhelm or lost threads.
- Onboarding, tutorials, and session map views are under development.

## 9. API Cost Awareness
- OpenAI’s GPT API is pay-per-token.
- Users can quickly exceed free limits with large or parallel branches.
- Usage feedback and model configuration needed.

## 10. Browser Dependency
- Chrome-only (for now).
- Does not work on mobile or non-Manifest V3-compatible browsers.
- Future: PWA model or browser-agnostic builds.

---

## Conclusion

Entropy is designed with openness and extensibility in mind. These constraints serve as a foundation for ethical design, user-centered decisions, and architectural integrity.

