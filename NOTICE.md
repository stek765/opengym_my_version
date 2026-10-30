# Third-party notices

openGym — Copyright (C) 2026 Duarte Santos.
openGym's own code is licensed under the **GNU AGPL v3.0** (see [LICENSE](LICENSE)).

## App store exception

As an additional permission under section 7 of the AGPL v3.0, the copyright holder permits
distribution of the openGym mobile application through app store platforms (such as the
Apple App Store and Google Play) whose terms of service would otherwise be incompatible
with the AGPL, provided the corresponding source code remains available under the AGPL at
the project repository. This permission applies to the distribution channel only and does
not otherwise limit the license.

## Bundled AI provider CLI

The api image installs the [**Claude Code CLI**](https://github.com/anthropics/claude-code)
(`@anthropic-ai/claude-code`, pinned in `api/Dockerfile`) so the optional AI Coach works
without the instance owner installing anything. openGym invokes it as a separate process at
runtime and does not link against it or include its source; this is mere aggregation, and
openGym's own AGPL v3.0 licensing is unchanged.

The CLI is distributed under its own terms, and using it requires an account with the
provider. Both are matters between the instance owner and Anthropic — openGym ships no
credentials and asks its users for none. Instances that would rather not carry it can leave
the Coach disabled (the default) or set `COACH_DISABLED=1`.

## Exercise data & media

The exercise names and instructions (in `frontend/src/lib/exercises-data.js`) and the
pictures (downloaded into `media/img/` by `scripts/fetch-media.sh`) come from
[**hasaneyldrm/exercises-dataset**](https://github.com/hasaneyldrm/exercises-dataset)
and are **not** covered by openGym's AGPL license — they remain under that dataset's own terms.
The media files are not distributed in this repository; they are downloaded from the upstream
source by that script. If you redistribute openGym with the media included, review the upstream
license first.
