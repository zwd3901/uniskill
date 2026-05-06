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
| `uniskill link` | Create symlinks (or junctions/copies) for all targets |
| `uniskill link --target <name>` | Only link a specific target |
| `uniskill link --dry-run` | Show what would be done without doing it |
| `uniskill unlink` | Remove all symlinks (does not delete source files) |
| `uniskill status` | Show link status for each target |

## Configuration

See `uniskill.yaml` in your project root:

```yaml
source: ./skills
targets:
  - name: codebuddy
    path: ~/.codebuddy/skills
    method: symlink
  - name: claude
    path: ~/.claude/skills
    method: symlink
```

### Methods

| Method | Platform | Description |
|--------|----------|-------------|
| `symlink` | Windows / macOS / Linux | Symbolic link (Windows may need Developer Mode) |
| `junction` | Windows only | Directory junction, no admin needed |
| `copy` | All | Direct file copy (loses sync benefit) |

## Supported Agents

Any AI coding tool that reads skills from a directory. Common examples:
- **CodeBuddy** — `~/.codebuddy/skills/`
- **Claude Code** — `~/.claude/skills/`
- **Cursor** — `~/.cursor/skills/`
- **Custom agents** — any path you configure

## License

MIT
