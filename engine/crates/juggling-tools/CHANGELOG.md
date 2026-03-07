# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0](https://github.com/calthejuggler/juggling-tools/releases/tag/juggling-tools-v0.1.0) - 2026-03-07

### Added

- *(engine)* add possible throws from state computation
- add abbreviated state notation
- add state tables

### Other

- *(engine)* compute graph and table directly
- *(engine)* add lazy transition enumeration
- *(engine)* implement Gosper's hack for state generation
- *(engine)* add precomputed binomial coefficient table
- add benchmark regression ci
- upgrade dependencies
- *(engine)* add parallel state computation with rayon
- fix clippy warning
- *(engine)* add intermediate transitions logic
- move juggling logic to juggling-tools crate
