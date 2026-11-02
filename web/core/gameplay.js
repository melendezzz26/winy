const question = (prompt, options, answer, explanation) => ({ prompt, options, answer, explanation });
const mission = (id, title, questions) => ({ id: `journey-${id}`, title, questions, category: 'Pasaporte del Perú', icon: '🧭' });
export const MISSIONS = {
  lima: mission('lima', 'Lima · Entre el río y el mar', [
    question('¿En qué región natural está Lima?', ['La costa', 'La selva baja', 'La puna'], 0, 'Lima se encuentra en la costa central del Perú, junto al océano Pacífico.'),
    question('¿Qué río cruza la ciudad de Lima?', ['El Amazonas', 'El Rímac', 'El Urubamba'], 1, 'El río Rímac cruza Lima y desemboca en el océano Pacífico.'),
    question('¿Cómo puedes cuidar una playa durante tu visita?', ['Dejando los envases en la arena', 'Llevándote tus residuos', 'Alimentando a todas las aves'], 1, 'Llevarte tus residuos ayuda a proteger el mar y a los animales de la costa.')
  ]),
  cusco: mission('cusco', 'Cusco · Caminos de los Andes', [
    question('¿Qué civilización construyó Machu Picchu?', ['La inca', 'La romana', 'La egipcia'], 0, 'Machu Picchu fue construido durante el periodo inca, en la región Cusco.'),
    question('¿En qué cordillera se encuentra Cusco?', ['Los Alpes', 'El Himalaya', 'Los Andes'], 2, 'Cusco está en la cordillera de los Andes.'),
    question('¿Qué animal andino se ha usado para transportar carga?', ['El delfín', 'La llama', 'El pingüino'], 1, 'Las llamas acompañan desde hace siglos a las comunidades andinas y pueden transportar carga.')
  ]),
  loreto: mission('loreto', 'Loreto · La aventura del gran río', [
    question('¿Cuál es la capital de Loreto?', ['Iquitos', 'Arequipa', 'Tacna'], 0, 'Iquitos es la capital de la región Loreto, en la Amazonía peruana.'),
    question('¿Qué gran río recorre Loreto?', ['El Nilo', 'El Amazonas', 'El Sena'], 1, 'El río Amazonas recorre Loreto y conecta comunidades de la Amazonía.'),
    question('¿Qué acción ayuda a cuidar la fauna amazónica?', ['Comprar animales silvestres', 'Respetar su hábitat', 'Llevarlos a casa como recuerdo'], 1, 'Observar a los animales sin extraerlos de su hábitat ayuda a conservar la fauna.')
  ]),
  arequipa: mission('arequipa', 'Arequipa · Al pie de los volcanes', [
    question('¿Qué volcán es un símbolo de Arequipa?', ['El Misti', 'El Vesubio', 'El Fuji'], 0, 'El Misti es uno de los volcanes más representativos del paisaje de Arequipa.'),
    question('¿Qué material caracteriza muchas construcciones de Arequipa?', ['El hielo', 'El sillar', 'La madera de bambú'], 1, 'El sillar es una roca de origen volcánico usada en numerosas construcciones de la ciudad.'),
    question('¿Qué gran ave se observa en el valle del Colca?', ['El flamenco del Caribe', 'El avestruz', 'El cóndor andino'], 2, 'El valle del Colca es conocido por la observación del cóndor andino.')
  ]),
  piura: mission('piura', 'Piura · Sol y bosque seco', [
    question('¿En qué parte del Perú está Piura?', ['En la costa norte', 'En la costa sur', 'En la selva de Loreto'], 0, 'Piura se encuentra en el norte del Perú.'),
    question('¿Qué árbol es característico del bosque seco del norte?', ['El abeto', 'El algarrobo', 'El arce'], 1, 'El algarrobo es un árbol característico de los bosques secos del norte peruano.'),
    question('¿Cómo puedes protegerte durante una caminata al sol?', ['Sin agua ni descanso', 'Con agua, sombra y protección solar', 'Mirando directamente al sol'], 1, 'Planificar agua, pausas a la sombra y protección solar ayuda a cuidarte durante una caminata.')
  ]),
  sanmartin: mission('sanmartin', 'San Martín · Un bosque por descubrir', [
    question('¿Cuál de estas ciudades está en San Martín?', ['Tarapoto', 'Pisco', 'Tacna'], 0, 'Tarapoto es una ciudad de la región San Martín.'),
    question('¿Qué ave habita los bosques de neblina y representa al Perú?', ['El pingüino emperador', 'El gallito de las rocas', 'El avestruz'], 1, 'El gallito de las rocas vive en bosques húmedos de los Andes y es el ave nacional del Perú.'),
    question('¿Qué ayuda a cuidar el bosque durante una visita?', ['Arrancar plantas como recuerdo', 'Salir de los senderos señalizados', 'Seguir los senderos y llevarse los residuos'], 2, 'Respetar los senderos y retirar los residuos reduce el impacto de nuestras visitas.')
  ])
};
export function completeDestination(state, id, score, total, now = Date.now()) {
  const game = Object.hasOwn(MISSIONS, id) ? MISSIONS[id] : null;
  if (!game || total !== game.questions.length || !Number.isInteger(score) || score < 0 || score > total) return { earned: false, required: 2 };
  const required = Math.ceil(total * 2 / 3);
  if (score < required) return { earned: false, required };
  state.passport ||= {};
  if (state.passport[id]) return { earned: false, already: true, required };
  state.passport[id] = { earnedAt: now, score, total };
  return { earned: true, required };
}
const GREETINGS = {
  cuy: ['¡Cui, cui! Listo para acompañarte.', 'Un reto pequeño también es una gran aventura.', '¿Vamos a conseguir otro sello para el pasaporte?'],
  llama: ['Vamos con calma. ¡Un paso a la vez!', 'Aquí estoy. ¿Descubrimos algo nuevo?', '¡Mis orejas están listas para otra historia!'],
  gallito: ['¡Hoy tengo mucha curiosidad!', 'Una pregunta más, una aventura más.', '¡A descubrir un nuevo destino juntos!'],
  condor: ['¡Nuestra próxima aventura está por despegar!', 'Un poquito más alto, a tu ritmo.', '¡Vamos a mirar el Perú con otros ojos!']
};
export function companionMessage(pet, index) { const messages = Object.hasOwn(GREETINGS, pet) ? GREETINGS[pet] : GREETINGS.cuy; return messages[index % messages.length]; }
