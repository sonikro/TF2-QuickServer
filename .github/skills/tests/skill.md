---
name: tests
description: "Use when writing or modifying Vitest test files (packages/**/*.test.ts, tests/*) in this repository. Enforces the Given/When/Then test style, a makeSut factory per test file, mocking via vitest-mock-extended and vitest-when (aws-sdk-client-mock for AWS, msw for fetch), mocks configured inside makeSut/tests rather than global beforeEach, table-driven tests with it.each, and asserting only public behavior. Do not use for the Go test files in shield/ (see the shield skill)."
---

# Writing Tests

All TypeScript tests use **Vitest** and follow the Given/When/Then approach.
The guidance below mirrors the repo's existing test suite conventions.

## General Test Structure

- Follow the Given/When/Then approach for all test cases:
  - `// Given` — set up dependencies and expectations
  - `// When` — invoke the behavior under test
  - `// Then` — assert the outcome
- Create a `makeSut` factory in each test file that returns:
  - the system under test (SUT)
  - all mocked dependencies
- Use `makeSut` in every test case to initialize the environment.
- Do not use shared state (`let` bindings or `beforeEach` mutating state) to
  share fixtures between tests — each test must be fully independent.

## Mocking

- Use `vitest-mock-extended` (`mock<T>()`) for mock objects.
- Use `vitest-when` (`when(...).calledWith(...).mockResolvedValue(...)`) to
  control mock behavior.
- Use `aws-sdk-client-mock` for AWS SDK clients.
- Use `msw` (Mock Service Worker) for external `fetch` requests.
- Configure mocks inside the test case or `makeSut` — never in a global
  `beforeEach`.

## Test Organization

- Group related tests with descriptive `describe` blocks.
- Use Given/When/Then test names that explain expected behavior.
- Favor table-driven tests using `it.each` for similar cases with varying input.
- Keep each test focused on a single behavior.
- Only test the public interface of the code, not implementation details.

## Example

```typescript
import { mock } from 'vitest-mock-extended';
import { when } from 'vitest-when';
import { MyService } from './my-service';
import { MyDependency } from './my-dependency';

describe('MyService', () => {
  function makeSut() {
    const myDependencyMock = mock<MyDependency>();
    const sut = new MyService({ myDependency: myDependencyMock });

    return { sut, myDependencyMock };
  }

  it('should do something when condition is met', async () => {
    // Given
    const { sut, myDependencyMock } = makeSut();
    when(myDependencyMock.someMethod).calledWith('input').mockResolvedValue('expected');

    // When
    const result = await sut.methodUnderTest('input');

    // Then
    expect(result).toBe('expected');
  });

  it.each([
    { input: 'value1', expected: 'result1' },
    { input: 'value2', expected: 'result2' },
  ])('should handle $input and return $expected', async ({ input, expected }) => {
    // Given
    const { sut, myDependencyMock } = makeSut();
    when(myDependencyMock.someMethod).calledWith(input).mockResolvedValue(expected);

    // When
    const result = await sut.methodUnderTest(input);

    // Then
    expect(result).toBe(expected);
  });
});
```

## Running Tests

- Run the full suite: `npm test`
- Typecheck code (tsc, which excludes test files) before declaring work done:
  `npm run build:backend`