# Contributing

## Development

```bash
git clone <repo>
cd uniskill
npm install
npm run dev        # Watch mode
npm test           # Run tests
```

## Project Structure

- `src/core/` — Business logic (linker, config)
- `src/commands/` — CLI command handlers
- `test/` — Tests

## Pull Requests

1. Ensure all tests pass: `npm test`
2. Add tests for new functionality
3. Update README if adding new commands or options
