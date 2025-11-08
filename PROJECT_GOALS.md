# WebBehaviorTree - Project Goals

## Vision

A lightweight, accessible behavior tree editor that enables developers to design AI visually in the browser and execute it in their target platform (Unity, web, etc.) without overhead.

## Core Principles

1. **Accessibility** - Browser-based editor, no installation required
2. **Minimal Overhead** - Zero-dependency runtime implementations
3. **Developer-Friendly** - Fast iteration, good documentation, clear examples
4. **Open Source** - Community-driven, helpful to other developers

## Current Features

### Web Editor (TypeScript)
- Visual node-based behavior tree editor
- Real-time execution and debugging
- JSON import/export for portability
- Custom node creation
- Blackboard system for shared data

### Unity SDK (C#)
- Lightweight runtime for importing web-designed trees
- Zero external dependencies
- Action registration via lambdas or inheritance
- Configurable tick rate (1-60 TPS)
- Debug visualization with Gizmos
- Compatible with Unity 2020.3+

### Workflow
```
Design (Web Browser)
  ↓ Export JSON
Import (Unity Project)
  ↓ Register Actions
Execute (Game Runtime)
```

## Active Development Goals

### 1. Test Suite Improvements ✅ In Progress
**Status:** 147 tests passing, 17 security tests documenting missing features

**Completed:**
- Edge case tests (14 tests) - empty trees, null handling, reset behavior
- Integration tests (5 tests) - export/import/execute workflows
- Security test specifications (17 tests) - scope isolation, timeout protection

**Remaining:**
- Implement security features (timeouts, scope sandboxing)
- Add performance regression tracking
- Memory leak detection tests

### 2. Unity SDK Enhancement
**Goals:**
- Visual debugger (highlight active nodes in Unity Editor)
- Custom inspector for BehaviorTreeRunner
- Blackboard runtime inspector
- More example templates (boss AI, dialogue, puzzles)
- Async action support for long-running operations

### 3. Web Editor Polish
**Goals:**
- Improved node search and filtering
- Template library browser
- Performance profiler for large trees
- Undo/redo system improvements
- Better error messages for malformed JSON

## Non-Goals

- Competing with commercial behavior tree solutions
- Building a full game engine
- Monetization or enterprise features
- Mobile app versions
- Real-time multiplayer collaboration

## Success Metrics

- **Usability:** Can a developer create a working AI in < 15 minutes?
- **Reliability:** Do tests catch real bugs before users encounter them?
- **Performance:** Can trees with 100+ nodes execute at 60 FPS?
- **Documentation:** Can new users follow quick start without external help?

## Contributing

This is a helpful open-source project. Contributions should focus on:
1. Making the tool easier to use
2. Adding practical examples and templates
3. Improving test coverage for edge cases
4. Fixing real user-reported issues
5. Better documentation

## Quick Links

- **Web Editor:** https://otdavies.github.io/WebBehaviorTree/
- **Unity SDK:** `/UnitySDK/` - Copy to Unity Assets folder
- **Templates:** `/templates/unity/` - Pre-built example trees
- **Tests:** `npm test` - Run test suite
- **Documentation:** `/UnitySDK/README.md` - Full Unity SDK guide

## License

MIT - Use freely in your projects!

---

**Last Updated:** 2025-11-08
