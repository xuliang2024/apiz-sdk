# Changesets

Run `pnpm changeset` whenever you make a user-visible change to `@apiz/sdk` or
`@apiz/mcp`. Pick the right semver bump (patch / minor / major), describe the
change in 1-3 sentences, and commit the generated markdown file in this folder.

When the release workflow runs, it will:

1. Aggregate pending changesets, bump versions, regenerate `CHANGELOG.md` for
   each affected package.
2. Open / update a "Version Packages" PR.
3. On merge, publish to npm with the correct tags.

The Python SDK and Go CLI use their own versioning schemes (`pyproject.toml`
and git tags respectively); changesets only governs the JS packages.
