---
title: tool runtime config
---

There is an object `toolRuntimeConfig` that gets passed to the tool service for every rendering info request. Before that, it can get altered at several points in the flow. The `toolRuntimeConfig` will get merged in the following order by overwriting the former in case of clashes.

1. options passed to the `@nzz/q-server/plugins/core/rendering-info` plugin on register, filtered by target and tool on runtime
2. as a query parameter or payload object to rendering-info endpoint


We use this the 1. option to pass the `toolBaseUrl` to the tool for the case where the client side js code of a tool needs to do additional requests to itself as the tool does not have knowledge about the URL to access itself otherwise. This knowledge is only available in Q server during runtime in our setup. Yours could vary here of course.
Use this for any runtime information that needs to be available in your tool.
