# Aegis docs

The manual for [Aegis](https://github.com/lamng3/aegis), published at <https://lamng3.github.io/aegis-docs/>.

Pages are written in `content/` (a header comment of `key: value` lines, then the body) and wrapped in the shared layout by `build.py`:

```bash
python3 build.py
```

Commit `content/` and the generated HTML together.
