# Aegis docs

The manual for [Aegis](https://github.com/lamng3/aegis), published at <https://lamng3.com/aegis/>.

Pages are written in `content/` (a header comment of `key: value` lines, then the body) and wrapped in the shared layout by `build.py`:

```bash
python3 build.py
```

Commit `content/` and the generated HTML together.

## Shared structure

`normalize.py` (a copy of the one in `memcommit-docs`) runs at the end of the build. It gives every content page a search box, an "On this page" list, previous and next links, and one title format, and writes `search-index.json`. It is called by `build.py`.
