# uniskill 设计文档

## 概述

uniskill 是一个 CLI 工具，用于统一管理 AI Agent 的 Skill 文件（SKILL.md），通过软链接将中央技能仓库同步到多个 Agent 的技能目录，实现"一处修改，处处生效"。

## 目标用户

使用多个 AI 编码 Agent（CodeBuddy、Claude Code、自定义 Agent 等）的开发者，希望统一管理技能文件，避免重复复制粘贴。

## 项目结构

```
uniskill/
├── src/
│   ├── index.ts                 ← CLI 入口 (commander)
│   ├── commands/
│   │   ├── init.ts              ← uniskill init
│   │   ├── link.ts              ← uniskill link
│   │   ├── unlink.ts            ← uniskill unlink
│   │   ├── status.ts            ← uniskill status
│   │   ├── list.ts              ← uniskill list
│   │   └── watch.ts             ← uniskill watch
│   ├── core/
│   │   ├── linker.ts            ← 跨平台软链接核心
│   │   ├── config.ts            ← 配置加载/校验/生成
│   │   └── watcher.ts           ← 文件监听
│   └── types/
│       └── index.ts             ← 类型定义
├── test/
│   ├── linker.test.ts
│   ├── config.test.ts
│   └── cli.test.ts
├── uniskill.yaml                ← 默认配置文件
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── README.md
├── CONTRIBUTING.md
└── LICENSE                      ← MIT
```

## 配置格式

文件 `uniskill.yaml`：

```yaml
# 中央技能目录，相对于配置文件路径或绝对路径
source: ./skills

# Agent 目标列表
targets:
  - name: codebuddy               # 目标名称
    path: ~/.codebuddy/skills     # Agent 技能目录路径
    method: symlink               # symlink | junction | copy

  - name: claude
    path: ~/.claude/skills
    method: symlink

  - name: my-custom-agent
    path: D:/CodeLab/my-agent/skills
    method: junction               # Windows 无需管理员权限
```

### method 说明

| method | 平台 | 说明 |
|--------|------|------|
| `symlink` | Windows / macOS / Linux | 符号链接（Windows 可能需要管理员权限） |
| `junction` | Windows 仅 | 目录联结，无需管理员权限 |
| `copy` | 全平台 | 直接复制文件（不推荐，失去共享优势） |

## CLI 命令

| 命令 | 说明 |
|------|------|
| `uniskill init` | 在当前目录生成 `uniskill.yaml` 模板 |
| `uniskill link` | 遍历 targets，为每个目标创建软链接 |
| `uniskill unlink` | 移除所有软链接（不删除源文件） |
| `uniskill status` | 查看各 target 的链接状态 |
| `uniskill list` | 列出中央仓库所有技能及关联的 target |
| `uniskill watch` | 监听 skills/ 目录变化，自动更新链接 |

### 命令详解

#### `uniskill init`

检查当前目录是否已存在 `uniskill.yaml`，若不存在则生成默认模板。

```bash
uniskill init
# 生成 uniskill.yaml 模板文件
```

#### `uniskill link`

核心命令。遍历配置文件中所有 target：
1. 校验 source 目录是否存在
2. 检查 target 路径的父目录是否存在，不存在则创建
3. 如果 target 已存在现有链接或目录，记录到冲突报告中
4. 根据 method 创建软链接 / junction / copy
5. 输出每个 target 的操作结果

```bash
uniskill link              # 链接所有 target
uniskill link --target codebuddy  # 仅链接指定 target
uniskill link --dry-run   # 仅展示要执行的操作，不实际执行
```

#### `uniskill status`

检查每个 target 的链接状态：

- ✅ `linked` — 软链接正常，指向的源文件存在
- ⚠️ `broken` — 软链接存在但指向的源文件不存在
- ➖ `missing` — 未创建链接
- ❌ `conflict` — 目标位置存在文件/目录但不是软链接

#### `uniskill watch`

使用 `chokidar` 监听 `source` 目录的 change / add / unlink 事件，每次变更后自动执行 `link` 命令（带防抖 500ms）。

```bash
uniskill watch                    # 监听并自动同步
uniskill watch --daemon           # 后台运行
```

#### `uniskill list`

列出 skills 目录下所有子目录（即每个技能），同时显示每个技能关联的 target。

```bash
uniskill list
# 输出：
# skillink/SKILL.md  → codebuddy, claude, my-custom-agent
# database/SKILL.md  → codebuddy, claude
# ...
```

## 跨平台链接策略

核心实现在 `core/linker.ts`：

```typescript
async function createLink(
  source: string,
  target: string,
  method: 'symlink' | 'junction' | 'copy'
): Promise<void>
```

1. 预处理：展开 `~` 为用户 home 目录，转换为绝对路径
2. 目录校验：source 必须存在
3. 冲突检测：target 已存在时：
   - 如果是有效软链接且指向相同 source → 跳过
   - 如果是有效软链接但指向不同 source → 替换
   - 如果是目录/文件 → 报错冲突，需要用户处理
4. 创建链接：
   - `symlink`: `fs.promises.symlink(source, target, 'dir')`，Windows 下需要 `--no-prompt` 权限提升
   - `junction`: Windows API `fs.promises.symlink` 带 `junction` 参数，无需管理员
   - `copy`: `fs.promises.cp(source, target, { recursive: true })`

## Watch 机制

```
chokidar.watch(source)
  │
  ├─ add / change / unlink 事件
  │   └─ debounce 500ms
  │       └─ 全量重新 link
  │
  └─ 初始链接：启动时自动执行 link
```

## 测试策略

| 测试层级 | 测试内容 | 工具 |
|---------|---------|------|
| 单元测试 | linker 核心逻辑（跨平台 mock） | vitest |
| 单元测试 | config 加载/校验/类型守卫 | vitest |
| 集成测试 | 临时目录创建/删除链接链 | vitest |
| E2E 测试 | CLI 命令全流程 | vitest + execa |

## 技术与依赖

- **运行环境**：Node.js ≥ 18
- **CLI 框架**：commander
- **YAML 解析**：js-yaml
- **文件监听**：chokidar
- **测试**：vitest
- **编译**：TypeScript → tsc / tsx

## 开源准备

- **License**: MIT
- **npm 包名**: uniskill
- **二进制名**: `uniskill`
- **关键词**: agent-skills, symlink-manager, ai-tools, skill-management
- **CI**: GitHub Actions (test + lint on push, publish on tag)
