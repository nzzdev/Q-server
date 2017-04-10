---
title: tool runtime config
---

There is an object `toolRuntimeConfig` that gets passed to the tool service in the end for every rendering info request. Before that, it can get altered at several points in the flow. The `toolRuntimeConfig` will get merged in that order by overwriting the former in case of clashes.

1. Q server config misc.toolRuntimeConfig (use this in case you want to pass some values to all tools)
2. Q server config tools in tool.endpoint.toolRuntimeConfig (where the value is filtered with the target)
3. as a query parameter or payload object to rendering-info endpoint