# uniskill

> 统一的 AI Agent Skill 管理工具 — 通过符号链接将技能文件从中央目录同步到多个 AI 编码代理。

**一个源目录，多个 Agent。一处修改，处处生效。**

[English](./README.md) | **简体中文**

> **已经有技能目录了？** 在已有技能的**父级目录**中执行 uniskill 命令。
>
> ```
> my-project/               ← 在此目录执行: uniskill init → uniskill link
> ├── skills/               ← 你已有的技能目录（配置中 source 设为 ./skills）
> │   ├── my-skill/
> │   └── another-skill/
> ```
>
> 只需将 `uniskill.yaml` 中的 `source` 改为你的目录名，然后运行 `uniskill link` 即可 — 无需新建目录。

## 安装

```bash
npm install -g @zhawk/uniskill
```

## 快速开始

```bash
# 1. 生成配置文件
uniskill init

# 2. 创建你的技能目录
mkdir skills
mkdir skills/my-first-skill
echo "# My Skill" > skills/my-first-skill/SKILL.md

# 3. 编辑 uniskill.yaml 设置你的目标 Agent
# （生成时带有默认配置 — 按需修改）

# 4. 链接所有技能
uniskill link

# 5. 查看链接状态
uniskill status
```

## 命令列表

| 命令 | 说明 |
|------|------|
| `uniskill init` | 生成 `uniskill.yaml` 配置模板 |
| `uniskill link` | 为所有 target 创建符号链接或目录联结 |
| `uniskill link --target <name>` | 仅链接指定的 target |
| `uniskill link --dry-run` | 预览将要执行的操作，不实际执行 |
| `uniskill unlink` | 移除所有符号链接（不删除源文件） |
| `uniskill status` | 查看每个 target 的链接状态 |
| `uniskill list` | 列出所有技能及其关联的 target |
| `uniskill watch` | 监听源目录变化，自动同步 |

## 配置说明

在项目根目录编辑 `uniskill.yaml`：

```yaml
source: ./skills
targets:
  - name: codebuddy
    path: ~/.codebuddy/skills
  - name: claude
    path: ~/.claude/skills
```

### 链接方式

工具会根据操作系统自动选择适合的链接方式：

| 平台 | 方式 | 说明 |
|------|------|------|
| Windows | 目录联结 (Junction) | 无需管理员权限或开发者模式 |
| macOS | 符号链接 (Symbolic Link) | 原生 POSIX 符号链接 |
| Linux | 符号链接 (Symbolic Link) | 原生 POSIX 符号链接 |

无需配置 `method` 字段 — 工具自动处理。

## 支持的 Agent

任何从目录读取技能的 AI 编码工具，常见示例：
- **CodeBuddy** — `~/.codebuddy/skills/`
- **Claude Code** — `~/.claude/skills/`
- **Cursor** — `~/.cursor/skills/`
- **自定义 Agent** — 任意你配置的路径

## 开源协议

MIT

---

> 本项目代码由 AI（CodeBuddy + DeepSeek-V4-Flash）辅助完成。
