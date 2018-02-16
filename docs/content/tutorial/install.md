### Installation

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis quis ultricies turpis. Integer imperdiet lacus eget congue mollis. Suspendisse vitae faucibus dui. Suspendisse et varius arcu. Suspendisse ultricies egestas imperdiet. Nunc gravida venenatis sem, ac vestibulum elit luctus et. Donec malesuada ante eget odio rhoncus porttitor.

```
import Resource from 'https://unpkg.com/run-core?module';
(async () => {
  const backend = await Resource.$import('https://api.example.com');
  document.body.innerText = await backend.hello();
})();

export default base =>
  class Backend extends base {
    async hello() {
      return 'Hello, @resources';
    }
  };
```

Sed nec nulla porta, ornare ante at, pulvinar turpis. Donec lobortis lacus a lectus dictum accumsan. Sed malesuada porta suscipit. Morbi viverra, urna ullamcorper condimentum aliquet, mauris purus hendrerit lorem, sit amet rutrum eros purus at tortor. Phasellus posuere scelerisque rutrum. Donec efficitur quam eleifend velit tempus euismod. In hac habitasse platea dictumst. Vivamus nibh orci, pretium elementum interdum in, tristique lacinia velit. Suspendisse ut dui erat.

#### Curabitur

Maecenas auctor nunc a mollis dapibus. Duis quis tortor at orci scelerisque egestas. Nulla ornare, neque in tristique posuere, arcu erat cursus nibh, id lobortis ipsum nunc quis sem. Ut vel urna viverra, commodo urna at, eleifend ex. Praesent condimentum rutrum risus eu scelerisque. Praesent ac eros dapibus, sollicitudin neque ut, consectetur nibh. Integer ac eleifend sapien. Curabitur libero quam, commodo at rhoncus sit amet, rhoncus ut justo.

Aliquam erat volutpat. Praesent quis auctor neque. Vivamus tristique a ex eget porttitor. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Donec ex odio, faucibus bibendum semper eget, egestas in nibh. Curabitur nisl nisl, gravida vel purus ut, sodales tristique sem. Suspendisse ultricies feugiat metus porttitor maximus.

Donec facilisis feugiat vulputate. Integer justo nisl, aliquam sed ullamcorper sed, imperdiet at lacus. Nulla tempor odio et tristique posuere. Sed a vehicula enim. Integer gravida dapibus dignissim. Proin faucibus lacus vel tellus fermentum vulputate. Sed eu malesuada libero, nec rutrum est. Pellentesque tincidunt ultricies est eu luctus. Maecenas ac orci eget urna accumsan mollis nec in arcu.
