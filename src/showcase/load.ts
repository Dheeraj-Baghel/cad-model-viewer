// Do not fetch/construct the embedded showcase on direct collection entry.
// Module bytes are cached by ES modules, but each caller gets its own model.
export async function loadShowcase(){const {createActuator}=await import('./actuator');return createActuator();}
