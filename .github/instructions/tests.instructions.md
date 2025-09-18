---
applyTo: "src/**/*.test.ts"
---

# Copilot Instructions for Test Files

## General Test Structure

- Follow the Given/When/Then approach for all test cases.
- Create a `makeSut` function in each test file that initializes:
  - The system under test (SUT)
  - All mocked dependencies
- Use `makeSut` in all test cases to initialize the test environment.
- Do not use shared test fixtures with `let` or `beforeEach` that persist state between tests.
- Each test should be completely independent from others to prevent test interference.

## Mocking Guidelines

- Use `vitest-mock-extended` for creating mock objects.
- Use `vitest-when` to control mock responses and behavior.
- For AWS services, use `aws-sdk-client-mock` to mock SDK clients.
- For HTTP requests using `fetch`, use `msw` (Mock Service Worker) to mock external servers.
- Configure mocks within the test case or within the `makeSut` function, not globally.

## Test Organization

- Group related tests with descriptive `describe` blocks.
- Use clear, descriptive test names that explain the expected behavior.
- Favor table-driven tests using `it.each` for similar test cases with different inputs/outputs.
- Keep test cases focused on testing a single behavior.

## Example Structure

```typescript
import { mock } from 'vitest-mock-extended';
import { when } from 'vitest-when';
import { MyService } from './my-service';
import { MyDependency } from './my-dependency';

describe('MyService', () => {
  // Define the makeSut function
  function makeSut() {
    // Mock dependencies
    const myDependencyMock = mock<MyDependency>();
    
    // Create SUT with mocked dependencies
    const sut = new MyService(myDependencyMock);
    
    return {
      sut,
      myDependencyMock
    };
  }
  
  it('should do something when condition is met', () => {
    // Given
    const { sut, myDependencyMock } = makeSut();
    when(myDependencyMock.someMethod).calledWith('input').thenReturn('expected');
    
    // When
    const result = sut.methodUnderTest('input');
    
    // Then
    expect(result).toBe('expected');
  });
  
  it.each([
    { input: 'value1', expected: 'result1' },
    { input: 'value2', expected: 'result2' },
  ])('should handle $input and return $expected', ({ input, expected }) => {
    // Given
    const { sut, myDependencyMock } = makeSut();
    when(myDependencyMock.someMethod).calledWith(input).thenReturn(expected);
    
    // When
    const result = sut.methodUnderTest(input);
    
    // Then
    expect(result).toBe(expected);
  });
});
```
