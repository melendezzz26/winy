export const PETS = [
  { id: 'cuy', name: 'Cuy', defaultName: 'Kuy', tagline: 'Pequeño, curioso, imparable', kind: 'Tu cuy' },
  { id: 'llama', name: 'Llama', defaultName: 'Nube', tagline: 'Tu calma entre montañas', kind: 'Tu llama' },
  { id: 'gallito', name: 'Gallito de las rocas', defaultName: 'Chispa', tagline: 'Una chispa de aventura', kind: 'Tu gallito de las rocas' },
  { id: 'condor', name: 'Cóndor andino', defaultName: 'Apu', tagline: 'Sueña y vuela más alto', kind: 'Tu cóndor andino' }
];
export const ITEMS = [
  { id: 'natural', name: 'Al natural', icon: '🍃', price: 0 },
  { id: 'scarf', name: 'Pañuelo coral', icon: '🧣', price: 35 },
  { id: 'crown', name: 'Corona del sol', icon: '👑', price: 65 },
  { id: 'flower', name: 'Flor viajera', icon: '🌼', price: 30 },
  { id: 'star', name: 'Insignia estrella', icon: '⭐', price: 45 },
  { id: 'medal', name: 'Medalla de oro', icon: '🏅', price: 80 }
];
const q = (prompt, options, answer, explanation) => ({ prompt, options, answer, explanation });
export const QUIZZES = {
  peru: { id: 'peru', icon: '⛰️', title: '¿Cuánto conoces tu Perú?', category: 'Cultura & aventura', questions: [
    q('¿En qué región se encuentra Machu Picchu?', ['Lima', 'Cusco', 'Loreto'], 1, 'Machu Picchu está en la región Cusco, en los Andes del Perú.'),
    q('¿Cuál es el ave nacional del Perú?', ['Gallito de las rocas', 'Pingüino de Humboldt', 'Pelícano'], 0, 'El gallito de las rocas vive en los bosques de neblina de los Andes.'),
    q('¿Qué antiguo pueblo construyó las líneas de Nasca?', ['Los incas', 'Los nasca', 'Los chimú'], 1, 'La cultura Nasca creó estos grandes geoglifos en la costa sur.'),
    q('¿Qué alimento se originó en los Andes?', ['Trigo', 'Arroz', 'Papa'], 2, 'La papa se domesticó en los Andes. En el Perú existen miles de variedades.'),
    q('¿Cuál de estos lugares está en la Amazonía peruana?', ['Iquitos', 'Tacna', 'Pisco'], 0, 'Iquitos es la capital de Loreto, en la Amazonía peruana.')
  ]},
  life: { id: 'life', icon: '🌱', title: 'La vida en modo curioso', category: 'Biología · Básico', questions: [
    q('¿Qué necesitan las plantas para realizar la fotosíntesis?', ['Solo tierra', 'Luz, agua y dióxido de carbono', 'Azúcar y oscuridad'], 1, 'Con la energía de la luz, las plantas producen azúcares a partir de agua y dióxido de carbono.'),
    q('¿Qué parte de la planta absorbe agua del suelo?', ['Las flores', 'Las raíces', 'Los frutos'], 1, 'Las raíces absorben agua y nutrientes del suelo.'),
    q('¿Qué órgano impulsa la sangre por nuestro cuerpo?', ['El corazón', 'El estómago', 'Los pulmones'], 0, 'El corazón funciona como una bomba que mueve la sangre.'),
    q('¿Qué hacen muchos insectos al visitar flores?', ['Transportan polen', 'Crean semillas de piedra', 'Cambian las raíces'], 0, 'Al transportar polen entre flores, ayudan a la reproducción de las plantas.'),
    q('¿Qué es un ecosistema?', ['Solo un grupo de animales', 'Un tipo de roca', 'Los seres vivos y el entorno donde se relacionan'], 2, 'Un ecosistema incluye seres vivos, agua, aire, suelo y sus relaciones.')
  ]},
  wellbeing: { id: 'wellbeing', icon: '🥑', title: 'Pequeñas decisiones, gran día', category: 'Bienestar · Vida diaria', questions: [
    q('¿Qué ayuda a concentrarte al empezar una sesión de estudio?', ['Abrir todas las redes', 'Definir una tarea pequeña', 'Estudiar con todas las notificaciones'], 1, 'Elegir una tarea concreta y pequeña te ayuda a empezar con claridad.'),
    q('¿Qué puedes hacer después de estudiar un rato?', ['No descansar nunca', 'Hacer una pausa y moverte', 'Saltarte las comidas'], 1, 'Una pausa breve para moverte puede ayudarte a retomar con energía.'),
    q('¿Cómo puedes darle variedad a tu plato?', ['Probar frutas y verduras de distintos colores', 'Comer siempre lo mismo', 'Evitar el agua'], 0, 'Los alimentos variados aportan distintos nutrientes. ¡Explora sabores locales!'),
    q('¿Qué hábito favorece un buen descanso?', ['Acostarse cada día mucho más tarde', 'Usar pantallas toda la noche', 'Mantener un horario regular'], 2, 'Un horario regular y una rutina tranquila pueden favorecer el descanso.')
  ]}
};
export const DESTINATIONS = [
  { id: 'lima', name: 'Lima', icon: '🌊', region: 'Costa', title: 'Una ciudad de historias', description: 'Descubre la costa y la riqueza cultural del Perú.', quiz: 'peru', coordinates: [-77.0428, -12.0464] },
  { id: 'cusco', name: 'Cusco', icon: '⛰️', region: 'Andes', title: 'Entre montañas e historias', description: 'Sigue los caminos de los Andes y descubre su legado.', quiz: 'peru', coordinates: [-71.9675, -13.5319] },
  { id: 'loreto', name: 'Loreto', icon: '🌿', region: 'Amazonía', title: 'La selva tiene mucho que contar', description: 'Explora la vida que crece junto a los grandes ríos.', quiz: 'life', coordinates: [-73.2516, -3.7491] },
  { id: 'arequipa', name: 'Arequipa', icon: '🌋', region: 'Andes', title: 'Al pie de los volcanes', description: 'Una parada para aprender sobre nuestra tierra y su cultura.', quiz: 'peru', coordinates: [-71.5375, -16.4090] },
  { id: 'piura', name: 'Piura', icon: '☀️', region: 'Costa', title: 'Un poquito de sol', description: 'Explora el norte con un reto de pequeñas decisiones cotidianas.', quiz: 'wellbeing', coordinates: [-80.6328, -5.1945] },
  { id: 'sanmartin', name: 'San Martín', icon: '🦋', region: 'Amazonía', title: 'Un bosque por descubrir', description: 'Acompaña al gallito de las rocas y aprende sobre la naturaleza.', quiz: 'life', coordinates: [-76.3656, -6.4825] }
];
export const FRIENDS = [
  { name: 'Valeria', pet: 'llama', petName: 'Nube', level: 7, accessory: 'flower' },
  { name: 'Diego', pet: 'condor', petName: 'Apu', level: 5, accessory: 'scarf' },
  { name: 'Sofía', pet: 'gallito', petName: 'Chispa', level: 9, accessory: 'crown' }
];
