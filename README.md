# uniskill

> Unified AI Agent Skill manager — symlink skills across multiple AI coding agents from one source directory.

**English** | [简体中文](./README.zh-CN.md)

**One source directory, multiple agents. Change once, sync everywhere.**

> **Already have a skills directory?** Run `uniskill` in the **parent directory** of your existing skills folder.
>
> ```
> my-project/               ← cd here, then run: uniskill init → uniskill link
> ├── skills/               ← your existing skills directory (set source: ./skills in config)
> │   ├── my-skill/
> │   └── another-skill/
> ```
>
> Just adjust `source` in `uniskill.yaml` to match your folder name, then run `uniskill link` — no need to create a new directory.

## Install

```bash
npm install -g @zhawk/uniskill
```

## Quick Start

```bash
# 1. Generate config
uniskill init

# 2. Create your skills directory
mkdir skills
mkdir skills/my-first-skill
echo "# My Skill" > skills/my-first-skill/SKILL.md

# 3. Edit uniskill.yaml to set your targets
# (generated with default targets — customize as needed)

# 4. Link everything
uniskill link

# 5. Check status
uniskill status
```

## Commands

| Command | Description |
|---------|-------------|
| `uniskill init` | Generate `uniskill.yaml` template |
| `uniskill link` | Create symlinks/junctions for all targets |
| `uniskill link --target <name>` | Only link a specific target |
| `uniskill link --dry-run` | Show what would be done without doing it |
| `uniskill unlink` | Remove all symlinks (does not delete source files) |
| `uniskill status` | Show link status for each target |
| `uniskill list` | List all skills and which targets they're linked to |
| `uniskill watch` | Watch source directory and auto-sync on changes |

## Configuration

See `uniskill.yaml` in your project root:

```yaml
source: ./skills
targets:
  - name: codebuddy
    path: ~/.codebuddy/skills
  - name: claude
    path: ~/.claude/skills
```

### Link Method

The tool automatically selects the appropriate link method for each platform:

| Platform | Method | Note |
|----------|--------|------|
| Windows | Junction | Directory junction, no admin or Developer Mode needed |
| macOS | Symbolic Link | Native POSIX symlink |
| Linux | Symbolic Link | Native POSIX symlink |

No `method` configuration needed — the tool handles this automatically.

## Supported Agents

Any AI coding tool that reads skills from a directory. Common examples:
- **CodeBuddy** — `~/.codebuddy/skills/`
- **Claude Code** — `~/.claude/skills/`
- **Cursor** — `~/.cursor/skills/`
- **Custom agents** — any path you configure

## License

MIT
