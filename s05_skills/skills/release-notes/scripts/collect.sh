#!/bin/sh
# 收集最近的非 merge 提交。默认在调用者的当前目录执行。
set -eu
repo="${1:-.}"
git -C "$repo" log --no-merges --pretty=format:'%h %s' -n 50 2>/dev/null || echo "(当前目录不是 git 仓库)"
