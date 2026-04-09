/**
 * Global Visual Movement Taxonomy
 *
 * Hierarchical tree of visual movements spanning all continents.
 * NOT western-biased: African, Asian, Latin American, Middle Eastern movements
 * are primary nodes, not "world art" sidebars.
 *
 * Each movement has a signature hex palette derived from actual works.
 * Used for: Visual Lineage Discovery, color-to-movement matching,
 * hex recommendations based on art movement associations.
 */

const movements = [
  // ═══════════════════════════════════════════════════════════════
  // AFRICA
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'ndebele_geometry',
    name: 'Ndebele Geometric',
    region: 'Southern Africa',
    country: 'South Africa',
    era_start: 1600,
    era_end: null,
    parent_id: null,
    hex_palette: ['#E63946', '#1D3557', '#F1FAEE', '#457B9D', '#FFB703'],
    cultural_context: 'Ndebele women paint bold geometric murals on house walls as identity markers and resistance. Each pattern encodes family lineage and social status.',
    key_practitioners: ['Esther Mahlangu', 'Francina Ndimande', 'Martha Mahlangu'],
    keywords: ['geometric', 'mural', 'primary colors', 'symmetry', 'resistance', 'identity'],
  },
  {
    id: 'kente_weaving',
    name: 'Kente Pattern',
    region: 'West Africa',
    country: 'Ghana',
    era_start: 1200,
    era_end: null,
    parent_id: null,
    hex_palette: ['#FFD700', '#006400', '#8B0000', '#000000', '#FF6B00'],
    cultural_context: 'Ashanti and Ewe strip-woven cloth where colors and patterns carry specific proverbs, social status, and philosophical meanings. Gold = royalty/wealth, green = renewal.',
    key_practitioners: ['Ashanti royal weavers', 'Ewe master weavers', 'Bobbo Ahiagble'],
    keywords: ['woven', 'strip', 'symbolic color', 'proverb', 'status', 'gold'],
  },
  {
    id: 'adire_textile',
    name: 'Adire / Yoruba Textile',
    region: 'West Africa',
    country: 'Nigeria',
    era_start: 1800,
    era_end: null,
    parent_id: null,
    hex_palette: ['#1B3A5C', '#F5F5DC', '#2C5F8A', '#E8E0D0', '#0F2744'],
    cultural_context: 'Yoruba resist-dyed indigo cloth using starch paste (adire eleko) or tied patterns (adire oniko). Deep indigo symbolizes wealth, coolness, and spiritual protection.',
    key_practitioners: ['Nike Davies-Okundaye', 'Gasali Adeyemo', 'Ife market dyers'],
    keywords: ['indigo', 'resist-dye', 'starch paste', 'organic', 'deep blue', 'spiritual'],
  },
  {
    id: 'nka_di_iche',
    name: 'Nka Di Iche Iche / Contemporary African',
    region: 'Pan-African',
    country: 'Nigeria',
    era_start: 1990,
    era_end: null,
    parent_id: null,
    hex_palette: ['#C41E3A', '#2F4F4F', '#DAA520', '#F5F5F5', '#1C1C1C'],
    cultural_context: 'Contemporary African art movement rejecting exoticization. Artists use local materials, global techniques, and personal mythology. Named after Igbo phrase meaning "art is different."',
    key_practitioners: ['El Anatsui', 'Yinka Shonibare', 'Njideka Akunyili Crosby', 'Wangechi Mutu'],
    keywords: ['mixed media', 'identity', 'diaspora', 'material', 'recycled', 'mythology'],
  },
  {
    id: 'tingatinga',
    name: 'Tingatinga',
    region: 'East Africa',
    country: 'Tanzania',
    era_start: 1968,
    era_end: null,
    parent_id: null,
    hex_palette: ['#FF4500', '#228B22', '#FFD700', '#000000', '#4169E1'],
    cultural_context: 'Bright enamel paint on masonite board. Animals, spirits, and daily life in saturated flat color. Founded by Edward Saidi Tingatinga in Dar es Salaam.',
    key_practitioners: ['Edward Saidi Tingatinga', 'Simon George Mpata', 'Hendrick Lilanga'],
    keywords: ['flat color', 'enamel', 'animal', 'saturated', 'folk', 'narrative'],
  },
  {
    id: 'nsibidi',
    name: 'Nsibidi / Igbo-Efik Sign System',
    region: 'West Africa',
    country: 'Nigeria',
    era_start: -400,
    era_end: null,
    parent_id: null,
    hex_palette: ['#1C1C1C', '#F5F5DC', '#8B4513', '#2F1B14', '#C9B89E'],
    cultural_context: 'Pre-colonial ideographic writing system of the Ekpe society. Abstract symbols encode concepts (love, conflict, death). Carved into skin, cloth, walls. Oldest African writing system still in use.',
    key_practitioners: ['Ekpe/Leopard society practitioners', 'Victor Ekpuk (contemporary)'],
    keywords: ['ideograph', 'abstract', 'carved', 'symbol', 'monochrome', 'ancient'],
  },
  {
    id: 'township_art',
    name: 'Township Aesthetic',
    region: 'Southern Africa',
    country: 'South Africa',
    era_start: 1960,
    era_end: null,
    parent_id: null,
    hex_palette: ['#FF6347', '#4682B4', '#FFD700', '#2E2E2E', '#FAFAD2'],
    cultural_context: 'Visual language of South African townships. Signage, corrugated iron murals, spaza shop graphics, protest posters. Urgent, resourceful, politically charged.',
    key_practitioners: ['Willie Bester', 'Gavin Jantjes', 'Dumile Feni', 'Gerard Sekoto'],
    keywords: ['protest', 'signage', 'corrugated', 'urgent', 'resourceful', 'political'],
  },

  // ═══════════════════════════════════════════════════════════════
  // ASIA + MIDDLE EAST
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'wabi_sabi',
    name: 'Wabi-Sabi',
    region: 'East Asia',
    country: 'Japan',
    era_start: 1400,
    era_end: null,
    parent_id: null,
    hex_palette: ['#8B7355', '#D2B48C', '#556B2F', '#2F2F2F', '#F5F0E6'],
    cultural_context: 'Aesthetic of imperfection, impermanence, and incompleteness. Weathered wood, cracked ceramics, moss-covered stone. Beauty in decay and the passage of time.',
    key_practitioners: ['Sen no Rikyu', 'Kintsugi artisans', 'Tadao Ando (architecture)'],
    keywords: ['imperfection', 'patina', 'natural', 'muted', 'organic', 'decay'],
  },
  {
    id: 'mono_no_aware',
    name: 'Mono no Aware',
    region: 'East Asia',
    country: 'Japan',
    era_start: 794,
    era_end: null,
    parent_id: null,
    hex_palette: ['#FFB7C5', '#F5F5F5', '#D4AF37', '#2F2F2F', '#87CEEB'],
    cultural_context: 'Awareness of impermanence. Cherry blossoms, falling leaves, twilight. Not sadness but bittersweet appreciation of the transient nature of beauty.',
    key_practitioners: ['Murasaki Shikibu', 'Hiroshi Sugimoto', 'Hayao Miyazaki'],
    keywords: ['transient', 'cherry blossom', 'melancholy', 'delicate', 'seasonal', 'light'],
  },
  {
    id: 'chinese_literati',
    name: 'Chinese Literati Painting',
    region: 'East Asia',
    country: 'China',
    era_start: 900,
    era_end: 1900,
    parent_id: null,
    hex_palette: ['#1C1C1C', '#F5F0E6', '#8B7355', '#C9B89E', '#3E3E3E'],
    cultural_context: 'Scholar-officials painting as personal expression, not professional commission. Ink wash on silk/paper. Mountains, bamboo, orchids. Emptiness as meaningful as mark.',
    key_practitioners: ['Su Shi', 'Ni Zan', 'Dong Qichang', 'Bada Shanren'],
    keywords: ['ink wash', 'negative space', 'bamboo', 'mountain', 'calligraphic', 'empty'],
  },
  {
    id: 'islamic_geometric',
    name: 'Islamic Geometric Art',
    region: 'Middle East / North Africa',
    country: 'Transnational',
    era_start: 700,
    era_end: null,
    parent_id: null,
    hex_palette: ['#1B4D3E', '#DAA520', '#1C1C1C', '#F5F5F5', '#0047AB'],
    cultural_context: 'Infinite tessellation patterns expressing divine order without figurative representation. Arabesques, muqarnas, zellige. Mathematical precision as spiritual practice.',
    key_practitioners: ['Alhambra artisans', 'Isfahan tile workers', 'Ahmed Moustafa (contemporary)'],
    keywords: ['tessellation', 'geometric', 'infinite', 'arabesque', 'tile', 'sacred'],
  },
  {
    id: 'persian_miniature',
    name: 'Persian Miniature',
    region: 'Middle East',
    country: 'Iran',
    era_start: 1200,
    era_end: 1700,
    parent_id: null,
    hex_palette: ['#4169E1', '#C5962B', '#DC143C', '#228B22', '#F0E68C'],
    cultural_context: 'Illuminated manuscript painting. Flattened perspective, jewel-like color, intricate pattern. Narratives from Shahnameh and Khamsa. Garden as paradise metaphor.',
    key_practitioners: ['Reza Abbasi', 'Kamal ud-Din Behzad', 'Sultan Muhammad'],
    keywords: ['miniature', 'illuminated', 'jewel color', 'flat perspective', 'garden', 'narrative'],
  },
  {
    id: 'mughal_miniature',
    name: 'Mughal Miniature',
    region: 'South Asia',
    country: 'India',
    era_start: 1526,
    era_end: 1857,
    parent_id: 'persian_miniature',
    hex_palette: ['#D4AF37', '#DC143C', '#1B4D3E', '#F5F0E6', '#4B0082'],
    cultural_context: 'Indo-Persian court painting fusing Persian miniature tradition with Indian naturalism. Portraiture, court scenes, nature studies. Unprecedented detail in depictions of animals and plants.',
    key_practitioners: ['Abu\'l Hasan', 'Mansur', 'Bichitr', 'Govardhan'],
    keywords: ['court', 'portrait', 'naturalism', 'ornate', 'gold leaf', 'botanical'],
  },
  {
    id: 'korean_minhwa',
    name: 'Minhwa / Korean Folk Painting',
    region: 'East Asia',
    country: 'Korea',
    era_start: 1392,
    era_end: null,
    parent_id: null,
    hex_palette: ['#DC143C', '#4169E1', '#228B22', '#FFD700', '#F5F5F5'],
    cultural_context: 'Anonymous folk paintings for domestic spaces. Tigers, magpies, peonies, books. Bold flat color, symbolic animals, everyday spiritual protection.',
    key_practitioners: ['Anonymous folk painters', 'Shin Saimdang (inspiration)', 'Kim Hong-do'],
    keywords: ['folk', 'symbolic', 'flat color', 'tiger', 'domestic', 'protection'],
  },
  {
    id: 'sumi_ink',
    name: 'Sumi-e / Ink Wash',
    region: 'East Asia',
    country: 'Japan / China',
    era_start: 600,
    era_end: null,
    parent_id: 'chinese_literati',
    hex_palette: ['#1C1C1C', '#4A4A4A', '#8B8B8B', '#C8C8C8', '#F5F0E6'],
    cultural_context: 'Black ink on white paper. Single brushstroke captures essence. Zen Buddhism influence. Bamboo, mountains, birds. Mastery through restraint.',
    key_practitioners: ['Sesshu Toyo', 'Hakuin Ekaku', 'Tohaku Hasegawa'],
    keywords: ['ink', 'brushstroke', 'zen', 'minimal', 'monochrome', 'essence'],
  },
  {
    id: 'indian_warli',
    name: 'Warli Art',
    region: 'South Asia',
    country: 'India',
    era_start: -2500,
    era_end: null,
    parent_id: null,
    hex_palette: ['#8B4513', '#F5F5DC', '#1C1C1C', '#D2691E', '#F0E68C'],
    cultural_context: 'Tribal wall painting of the Warli people in Maharashtra. White circles, triangles, lines on mud-brown ground. Dance, harvest, animals, daily life in geometric reduction.',
    key_practitioners: ['Jivya Soma Mashe', 'Balu Mashe', 'Warli tribal women painters'],
    keywords: ['tribal', 'geometric', 'dance', 'white on brown', 'stick figure', 'circle'],
  },

  // ═══════════════════════════════════════════════════════════════
  // LATIN AMERICA + CARIBBEAN
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'muralismo',
    name: 'Mexican Muralism',
    region: 'Latin America',
    country: 'Mexico',
    era_start: 1920,
    era_end: 1970,
    parent_id: null,
    hex_palette: ['#C41E3A', '#2E5E1E', '#B8860B', '#1C1C1C', '#F4A460'],
    cultural_context: 'Public wall painting as revolutionary education. Indigenous heritage, class struggle, national identity. Art for the people, on the people\'s walls.',
    key_practitioners: ['Diego Rivera', 'David Alfaro Siqueiros', 'Jose Clemente Orozco'],
    keywords: ['mural', 'revolution', 'indigenous', 'public', 'monumental', 'narrative'],
  },
  {
    id: 'tropicalia_visual',
    name: 'Tropicalia Visual',
    region: 'Latin America',
    country: 'Brazil',
    era_start: 1967,
    era_end: 1972,
    parent_id: null,
    hex_palette: ['#FF6347', '#00CED1', '#FFD700', '#FF69B4', '#32CD32'],
    cultural_context: 'Brazilian counter-cultural explosion mixing local and global, folk and avant-garde. Saturated tropical color as political resistance against military dictatorship.',
    key_practitioners: ['Helio Oiticica', 'Lygia Clark', 'Lygia Pape', 'Cildo Meireles'],
    keywords: ['tropical', 'saturated', 'participatory', 'counter-culture', 'installation', 'body'],
  },
  {
    id: 'neo_concrete',
    name: 'Neo-Concretism',
    region: 'Latin America',
    country: 'Brazil',
    era_start: 1959,
    era_end: 1965,
    parent_id: null,
    hex_palette: ['#FF0000', '#FFD700', '#0000FF', '#F5F5F5', '#1C1C1C'],
    cultural_context: 'Rejecting cold rationalism of European concrete art. Art as living organism, not machine. Viewer participation, sensory experience, organic geometry.',
    key_practitioners: ['Lygia Clark', 'Lygia Pape', 'Helio Oiticica'],
    keywords: ['participatory', 'organic', 'geometric', 'sensory', 'viewer', 'living'],
  },
  {
    id: 'guna_mola',
    name: 'Guna Mola',
    region: 'Central America',
    country: 'Panama / Colombia',
    era_start: 1700,
    era_end: null,
    parent_id: null,
    hex_palette: ['#FF4500', '#FFD700', '#1C1C1C', '#FF1493', '#00FF00'],
    cultural_context: 'Reverse-applique textile panels by Guna women. Layered fabric cut to reveal colors beneath. Animals, plants, mythological figures in vivid saturated fields.',
    key_practitioners: ['Guna women artisans', 'Lisa Fittipaldi (documenter)'],
    keywords: ['textile', 'layered', 'reverse applique', 'vivid', 'animal', 'mythological'],
  },

  // ═══════════════════════════════════════════════════════════════
  // INDIGENOUS + OCEANIA
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'aboriginal_dot',
    name: 'Aboriginal Dot Painting',
    region: 'Oceania',
    country: 'Australia',
    era_start: 1970,
    era_end: null,
    parent_id: null,
    hex_palette: ['#8B4513', '#C8A951', '#F5F5DC', '#DC143C', '#1C1C1C'],
    cultural_context: 'Western Desert art movement. Dreamtime narratives encoded as dot patterns over aerial landscape views. Ancient songline maps rendered in acrylic on canvas.',
    key_practitioners: ['Emily Kame Kngwarreye', 'Clifford Possum Tjapaltjarri', 'Ronnie Tjampitjinpa'],
    keywords: ['dot', 'dreamtime', 'aerial', 'sacred', 'earth tone', 'songline'],
  },
  {
    id: 'pacific_tapa',
    name: 'Pacific Tapa Cloth',
    region: 'Oceania',
    country: 'Samoa / Tonga / Fiji',
    era_start: -1500,
    era_end: null,
    parent_id: null,
    hex_palette: ['#8B4513', '#F5F0E6', '#2F1B14', '#D2B48C', '#1C1C1C'],
    cultural_context: 'Bark cloth beaten from mulberry tree. Geometric patterns stamped or painted with natural dyes. Ceremonial and daily use. Each island has distinct patterns.',
    key_practitioners: ['Tongan and Samoan women artisans', 'Ruha Fifita (contemporary)'],
    keywords: ['bark cloth', 'beaten', 'geometric', 'natural dye', 'ceremonial', 'stamped'],
  },
  {
    id: 'maori_ta_moko',
    name: 'Maori Ta Moko',
    region: 'Oceania',
    country: 'New Zealand',
    era_start: -1000,
    era_end: null,
    parent_id: null,
    hex_palette: ['#1C1C1C', '#2F2F2F', '#8B4513', '#F5F0E6', '#4A4A4A'],
    cultural_context: 'Sacred facial and body tattooing encoding genealogy, rank, and spiritual power. Curvilinear spirals (koru) representing unfurling fern frond, new life, growth.',
    key_practitioners: ['Tohunga ta moko (expert practitioners)', 'Tame Iti (contemporary)'],
    keywords: ['spiral', 'koru', 'tattoo', 'genealogy', 'sacred', 'curvilinear'],
  },

  // ═══════════════════════════════════════════════════════════════
  // EUROPEAN + NORTH AMERICAN (included but not privileged)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'bauhaus',
    name: 'Bauhaus',
    region: 'Europe',
    country: 'Germany',
    era_start: 1919,
    era_end: 1933,
    parent_id: null,
    hex_palette: ['#FF0000', '#0000FF', '#FFD700', '#F5F5F5', '#1C1C1C'],
    cultural_context: 'Total design school merging art, craft, and technology. Primary colors, geometric forms, functional beauty. Form follows function. Destroyed by Nazis, scattered globally.',
    key_practitioners: ['Walter Gropius', 'Laszlo Moholy-Nagy', 'Josef Albers', 'Anni Albers'],
    keywords: ['geometric', 'primary', 'functional', 'grid', 'universal', 'rational'],
  },
  {
    id: 'swiss_international',
    name: 'Swiss International Style',
    region: 'Europe',
    country: 'Switzerland',
    era_start: 1950,
    era_end: 1970,
    parent_id: 'bauhaus',
    hex_palette: ['#FF0000', '#1C1C1C', '#F5F5F5', '#4A4A4A', '#C8C8C8'],
    cultural_context: 'Grid-based typography and layout. Helvetica. Clean, objective communication. The idea that design should be invisible, serving content above style.',
    key_practitioners: ['Josef Muller-Brockmann', 'Emil Ruder', 'Max Bill', 'Armin Hofmann'],
    keywords: ['grid', 'helvetica', 'clean', 'objective', 'typography', 'minimal'],
  },
  {
    id: 'de_stijl',
    name: 'De Stijl',
    region: 'Europe',
    country: 'Netherlands',
    era_start: 1917,
    era_end: 1931,
    parent_id: null,
    hex_palette: ['#FF0000', '#0000FF', '#FFD700', '#F5F5F5', '#1C1C1C'],
    cultural_context: 'Pure abstraction through primary colors and orthogonal lines. Vertical + horizontal = universal harmony. Utopian belief that abstract art could transform society.',
    key_practitioners: ['Piet Mondrian', 'Theo van Doesburg', 'Gerrit Rietveld'],
    keywords: ['primary', 'grid', 'orthogonal', 'abstract', 'utopian', 'harmony'],
  },
  {
    id: 'minimalism_art',
    name: 'Minimalism',
    region: 'North America',
    country: 'United States',
    era_start: 1960,
    era_end: 1975,
    parent_id: null,
    hex_palette: ['#F5F5F5', '#C8C8C8', '#1C1C1C', '#4A4A4A', '#E0E0E0'],
    cultural_context: 'What you see is what you see. Industrial materials, geometric forms, serial repetition. Stripping art to its essential qualities. Anti-expressionist.',
    key_practitioners: ['Donald Judd', 'Dan Flavin', 'Agnes Martin', 'Sol LeWitt'],
    keywords: ['industrial', 'serial', 'geometric', 'essential', 'monochrome', 'space'],
  },
  {
    id: 'brutalism',
    name: 'Brutalism',
    region: 'Europe',
    country: 'United Kingdom / Global',
    era_start: 1950,
    era_end: 1975,
    parent_id: null,
    hex_palette: ['#808080', '#505050', '#C8C8C8', '#2F2F2F', '#A0A0A0'],
    cultural_context: 'Raw concrete (beton brut) as honest material. Monumental social housing, civic buildings. Utopian modernism for the masses. Now cult aesthetic.',
    key_practitioners: ['Le Corbusier', 'Alison & Peter Smithson', 'Tadao Ando', 'Ernesto Gomez'],
    keywords: ['concrete', 'raw', 'monumental', 'gray', 'geometric', 'honest'],
  },
  {
    id: 'vaporwave',
    name: 'Vaporwave',
    region: 'Internet',
    country: 'Global',
    era_start: 2010,
    era_end: 2018,
    parent_id: null,
    hex_palette: ['#FF71CE', '#01CDFE', '#B967FF', '#FFFB96', '#05FFA1'],
    cultural_context: 'Internet-born aesthetic critiquing consumer capitalism through ironic nostalgia. 80s/90s corporate imagery, Japanese text, pastel gradients, glitch. Accelerationist satire or sincere longing.',
    key_practitioners: ['Macintosh Plus', 'James Ferraro', 'Blank Banshee'],
    keywords: ['pastel', 'retro', 'glitch', 'nostalgia', 'corporate', 'ironic'],
  },
  {
    id: 'afrofuturism_visual',
    name: 'Afrofuturism Visual',
    region: 'Diaspora',
    country: 'Global',
    era_start: 1970,
    era_end: null,
    parent_id: null,
    hex_palette: ['#CFB53B', '#4B0082', '#1C1C1C', '#C0C0C0', '#00CED1'],
    cultural_context: 'Black speculative aesthetics merging African mythology, technology, and future visions. Gold, deep purple, chrome. Reclaiming the future as African space.',
    key_practitioners: ['Sun Ra', 'Wangechi Mutu', 'Toyin Ojih Odutola', 'Kehinde Wiley'],
    keywords: ['speculative', 'gold', 'chrome', 'mythology', 'future', 'black'],
  },
  {
    id: 'arte_povera',
    name: 'Arte Povera',
    region: 'Europe',
    country: 'Italy',
    era_start: 1967,
    era_end: 1980,
    parent_id: null,
    hex_palette: ['#8B4513', '#C9B89E', '#556B2F', '#4A4A4A', '#F5F0E6'],
    cultural_context: 'Poor art using everyday and natural materials. Earth, wood, cloth, metal, fire. Attacking institutional and commercial values. Raw process over polished product.',
    key_practitioners: ['Jannis Kounellis', 'Mario Merz', 'Giovanni Anselmo', 'Michelangelo Pistoletto'],
    keywords: ['earth', 'raw material', 'natural', 'anti-commercial', 'process', 'humble'],
  },
  {
    id: 'helmut_lang_era',
    name: 'Helmut Lang / 90s Minimalist Fashion',
    region: 'Europe / North America',
    country: 'Austria / USA',
    era_start: 1990,
    era_end: 2005,
    parent_id: 'minimalism_art',
    hex_palette: ['#1C1C1C', '#F5F5F5', '#808080', '#2F2F2F', '#C8C8C8'],
    cultural_context: 'Anti-fashion fashion. Raw hems, clear materials, industrial textures. Advertising as art, art as commerce. The austere precision of "nothing to hide behind."',
    key_practitioners: ['Helmut Lang', 'Martin Margiela', 'Jil Sander', 'Ann Demeulemeester'],
    keywords: ['austere', 'raw edge', 'deconstructed', 'monochrome', 'industrial', 'anti-fashion'],
  },
  {
    id: 'sade_minimalism',
    name: 'Sade Minimalism',
    region: 'Global',
    country: 'United Kingdom / Nigeria',
    era_start: 1984,
    era_end: null,
    parent_id: 'minimalism_art',
    hex_palette: ['#2F2F2F', '#C9B89E', '#8B7355', '#F5F0E6', '#1C1C1C'],
    cultural_context: 'Quiet luxury before the term existed. Warm neutrals, draped fabrics, gold jewelry on dark skin. Nigerian-British cool: never raising your voice but always being heard.',
    key_practitioners: ['Sade Adu', 'Quiet luxury movement', 'Old Celine (Phoebe Philo)'],
    keywords: ['quiet luxury', 'warm neutral', 'gold', 'understated', 'draped', 'elegant'],
  },
  {
    id: 'myspace_blog_anemia',
    name: 'Blog Era Anemia / Tumblr Pale',
    region: 'Internet',
    country: 'Global',
    era_start: 2008,
    era_end: 2014,
    parent_id: null,
    hex_palette: ['#D4C5B0', '#E8DDD3', '#8B7765', '#F5F0E6', '#4A4A4A'],
    cultural_context: 'Desaturated, overexposed photography. Film grain, pale skin, muted earth tones. Indie blogs, Myspace scene, early Tumblr. Melancholy as aesthetic identity.',
    key_practitioners: ['Petra Collins (early)', 'Ryan McGinley', 'Lana Del Rey visuals'],
    keywords: ['desaturated', 'pale', 'overexposed', 'film grain', 'melancholy', 'indie'],
  },
  {
    id: 'ghanaian_fantasy_coffin',
    name: 'Ghanaian Fantasy Coffin',
    region: 'West Africa',
    country: 'Ghana',
    era_start: 1950,
    era_end: null,
    parent_id: null,
    hex_palette: ['#FF4500', '#FFFFFF', '#0047AB', '#228B22', '#FFD700'],
    cultural_context: 'Figurative coffins shaped as cars, animals, phones, Coca-Cola bottles. Celebrating the deceased\'s life and aspirations. Vivid paint, skilled carpentry, joyful mortality.',
    key_practitioners: ['Seth Kane Kwei', 'Paa Joe', 'Eric Adjetey Anang'],
    keywords: ['figurative', 'vivid', 'mortality', 'celebration', 'sculptural', 'identity'],
  },
  {
    id: 'op_art',
    name: 'Op Art',
    region: 'Europe / North America',
    country: 'United Kingdom / Hungary',
    era_start: 1960,
    era_end: 1970,
    parent_id: null,
    hex_palette: ['#1C1C1C', '#F5F5F5', '#808080', '#C8C8C8', '#2F2F2F'],
    cultural_context: 'Optical illusions through precise geometric patterns. Black and white creating movement, vibration, depth on flat surface. Perceptual rather than emotional art.',
    key_practitioners: ['Bridget Riley', 'Victor Vasarely', 'Jesus Rafael Soto', 'Carlos Cruz-Diez'],
    keywords: ['optical', 'illusion', 'geometric', 'black and white', 'vibration', 'perception'],
  },
  {
    id: 'ukiyo_e',
    name: 'Ukiyo-e / Floating World',
    region: 'East Asia',
    country: 'Japan',
    era_start: 1615,
    era_end: 1912,
    parent_id: null,
    hex_palette: ['#4169E1', '#DC143C', '#F5F0E6', '#1C1C1C', '#228B22'],
    cultural_context: 'Woodblock prints of the pleasure quarters, kabuki actors, landscapes. Flat color, bold outlines, atmospheric perspective. Massively influenced Western impressionism.',
    key_practitioners: ['Hokusai', 'Hiroshige', 'Utamaro', 'Sharaku'],
    keywords: ['woodblock', 'flat color', 'outline', 'wave', 'landscape', 'ephemeral'],
  },
  {
    id: 'concrete_poetry_visual',
    name: 'Concrete Poetry / Visual Text',
    region: 'Latin America / Europe',
    country: 'Brazil / Switzerland',
    era_start: 1955,
    era_end: null,
    parent_id: null,
    hex_palette: ['#1C1C1C', '#FF0000', '#F5F5F5', '#4A4A4A', '#0000FF'],
    cultural_context: 'Words as visual objects. Typography is the art. Letter spacing, size, position create meaning beyond semantics. Brazilian Noigandres group pioneered globally.',
    key_practitioners: ['Augusto de Campos', 'Decio Pignatari', 'Eugen Gomringer', 'Ian Hamilton Finlay'],
    keywords: ['typography', 'spatial', 'word', 'visual', 'concrete', 'letter'],
  },

  // ═══════════════════════════════════════════════════════════════
  // WESTERN FINE ART — WARM MOVEMENTS
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'impressionism',
    name: 'Impressionism',
    region: 'Europe',
    country: 'France',
    era_start: 1867,
    era_end: 1886,
    parent_id: null,
    hex_palette: ['#4682B4', '#C4A132', '#8FBC8F', '#FFB6C1', '#F5F5DC'],
    cultural_context: 'Capturing fleeting light and atmosphere. Broken brushstrokes, outdoor painting, ordinary subjects bathed in color. Rejected salon perfection for perception.',
    key_practitioners: ['Claude Monet', 'Pierre-Auguste Renoir', 'Edgar Degas', 'Berthe Morisot'],
    keywords: ['light', 'outdoor', 'brushstroke', 'atmosphere', 'fleeting', 'color'],
  },
  {
    id: 'fauvism',
    name: 'Fauvism',
    region: 'Europe',
    country: 'France',
    era_start: 1905,
    era_end: 1908,
    parent_id: 'impressionism',
    hex_palette: ['#FF4500', '#4169E1', '#FF8C00', '#228B22', '#FFD700'],
    cultural_context: 'Wild beasts of color. Non-naturalistic, explosively saturated pigment applied directly. Color as emotion, not description. The most radical chromatic liberation in Western art.',
    key_practitioners: ['Henri Matisse', 'Andre Derain', 'Maurice de Vlaminck', 'Raoul Dufy'],
    keywords: ['saturated', 'wild', 'expressive', 'non-naturalistic', 'chromatic', 'liberation'],
  },
  {
    id: 'art_deco',
    name: 'Art Deco',
    region: 'Europe / North America',
    country: 'France / USA',
    era_start: 1920,
    era_end: 1939,
    parent_id: null,
    hex_palette: ['#DAA520', '#1B4D3E', '#F5F5DC', '#1C1C1C', '#B22222'],
    cultural_context: 'Glamorous modernism. Geometric patterns, luxurious materials, streamlined forms. Gold, emerald, onyx. The aesthetic of machine-age optimism and cocktail hour elegance.',
    key_practitioners: ['Tamara de Lempicka', 'Erte', 'A.M. Cassandre', 'Chrysler Building architects'],
    keywords: ['glamour', 'geometric', 'gold', 'luxury', 'streamlined', 'machine-age'],
  },
  {
    id: 'color_field',
    name: 'Color Field Painting',
    region: 'North America',
    country: 'United States',
    era_start: 1950,
    era_end: 1970,
    parent_id: null,
    hex_palette: ['#8B0000', '#4B0082', '#FF6B00', '#191970', '#DAA520'],
    cultural_context: 'Vast planes of pure color creating immersive emotional fields. Painting as environment, not image. Rothko\'s luminous rectangles, Frankenthaler\'s stained canvases.',
    key_practitioners: ['Mark Rothko', 'Helen Frankenthaler', 'Morris Louis', 'Barnett Newman'],
    keywords: ['immersive', 'saturated', 'field', 'emotional', 'luminous', 'vast'],
  },
  {
    id: 'neo_expressionism',
    name: 'Neo-Expressionism',
    region: 'North America / Europe',
    country: 'USA / Germany / Italy',
    era_start: 1978,
    era_end: 1990,
    parent_id: null,
    hex_palette: ['#4169E1', '#DC143C', '#D4A017', '#1C1C1C', '#FF69B4'],
    cultural_context: 'Return to raw figuration and emotional intensity after Minimalism and Conceptualism. Graffiti meets gallery. Street energy on monumental canvas.',
    key_practitioners: ['Jean-Michel Basquiat', 'Julian Schnabel', 'Anselm Kiefer', 'Georg Baselitz'],
    keywords: ['raw', 'figuration', 'graffiti', 'monumental', 'street', 'emotional'],
  },
  {
    id: 'pop_art',
    name: 'Pop Art',
    region: 'North America / Europe',
    country: 'USA / United Kingdom',
    era_start: 1956,
    era_end: 1970,
    parent_id: null,
    hex_palette: ['#FF0000', '#FFD700', '#0000FF', '#FF1493', '#F5F5F5'],
    cultural_context: 'Mass culture as high art. Advertising, comics, consumer products elevated through repetition and scale. Ironic celebration of the everyday image.',
    key_practitioners: ['Andy Warhol', 'Roy Lichtenstein', 'David Hockney', 'Claes Oldenburg'],
    keywords: ['mass culture', 'repetition', 'commercial', 'bold', 'ironic', 'everyday'],
  },
  {
    id: 'art_nouveau',
    name: 'Art Nouveau',
    region: 'Europe',
    country: 'France / Austria / Belgium',
    era_start: 1890,
    era_end: 1910,
    parent_id: null,
    hex_palette: ['#BF9B30', '#2E8B57', '#DEB887', '#F5F0E6', '#008B8B'],
    cultural_context: 'Total art embracing all design. Organic curves inspired by natural forms. Whiplash lines, floral motifs, sensuous flowing shapes. Art in every object of daily life.',
    key_practitioners: ['Alphonse Mucha', 'Gustav Klimt', 'Antoni Gaudi', 'Hector Guimard'],
    keywords: ['organic', 'flowing', 'floral', 'gold', 'sensuous', 'total design'],
  },
  {
    id: 'surrealism_visual',
    name: 'Surrealism',
    region: 'Europe',
    country: 'France / Spain',
    era_start: 1924,
    era_end: 1966,
    parent_id: null,
    hex_palette: ['#87CEEB', '#C9B037', '#DC143C', '#4B0082', '#F5DEB3'],
    cultural_context: 'Unlocking the unconscious through visual paradox. Dream logic, uncanny juxtaposition, melting reality. Art as psychic automatism and liberation from reason.',
    key_practitioners: ['Salvador Dali', 'Rene Magritte', 'Remedios Varo', 'Leonora Carrington'],
    keywords: ['dream', 'unconscious', 'paradox', 'juxtaposition', 'melting', 'uncanny'],
  },
  {
    id: 'abstract_expressionism',
    name: 'Abstract Expressionism',
    region: 'North America',
    country: 'United States',
    era_start: 1943,
    era_end: 1962,
    parent_id: null,
    hex_palette: ['#1C1C1C', '#F5F5F5', '#DC143C', '#FFD700', '#0047AB'],
    cultural_context: 'Pure gesture and emotion on monumental canvas. Action painting and contemplative fields. New York replaces Paris as art capital.',
    key_practitioners: ['Jackson Pollock', 'Willem de Kooning', 'Franz Kline', 'Lee Krasner'],
    keywords: ['gesture', 'action', 'monumental', 'drip', 'emotional', 'spontaneous'],
  },
  {
    id: 'pre_raphaelite',
    name: 'Pre-Raphaelite Brotherhood',
    region: 'Europe',
    country: 'United Kingdom',
    era_start: 1848,
    era_end: 1900,
    parent_id: null,
    hex_palette: ['#006400', '#B7410E', '#DAA520', '#FFFFF0', '#DC143C'],
    cultural_context: 'Rejecting industrial modernity for medieval intensity. Jewel-bright color, meticulous botanical detail, mythological and literary subjects. Beauty as moral force.',
    key_practitioners: ['Dante Gabriel Rossetti', 'John Everett Millais', 'John William Waterhouse', 'Edward Burne-Jones'],
    keywords: ['jewel', 'medieval', 'botanical', 'literary', 'detailed', 'romantic'],
  },

  // ═══════════════════════════════════════════════════════════════
  // PHOTOGRAPHY
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'new_color_photography',
    name: 'New Color Photography',
    region: 'North America',
    country: 'United States',
    era_start: 1970,
    era_end: null,
    parent_id: null,
    hex_palette: ['#DC143C', '#228B22', '#4682B4', '#D2B48C', '#87CEEB'],
    cultural_context: 'Color film as serious art medium. Saturated everyday America: gas stations, diners, suburban lawns. Finding the extraordinary in the banal through pure color.',
    key_practitioners: ['William Eggleston', 'Stephen Shore', 'Joel Meyerowitz', 'Joel Sternfeld'],
    keywords: ['saturated', 'everyday', 'documentary', 'color film', 'banal', 'American'],
  },
  {
    id: 'dramatic_fashion_photography',
    name: 'Fashion Photography / Dramatic',
    region: 'Europe / North America',
    country: 'Global',
    era_start: 1960,
    era_end: null,
    parent_id: null,
    hex_palette: ['#DC143C', '#C7A938', '#1C1C1C', '#F5F5F5', '#191970'],
    cultural_context: 'Fashion as theatre. Dramatic lighting, bold composition, provocative narrative. The body as sculptural form. Power, desire, and spectacle in controlled environments.',
    key_practitioners: ['Helmut Newton', 'Guy Bourdin', 'Richard Avedon', 'Tim Walker'],
    keywords: ['dramatic', 'fashion', 'theatrical', 'bold', 'provocative', 'sculptural'],
  },

  // ═══════════════════════════════════════════════════════════════
  // CINEMA
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'wong_kar_wai_cinema',
    name: 'Wong Kar-wai / Saturated Cinema',
    region: 'East Asia',
    country: 'Hong Kong',
    era_start: 1990,
    era_end: null,
    parent_id: null,
    hex_palette: ['#DC143C', '#00CED1', '#B5942D', '#006400', '#1C1C1C'],
    cultural_context: 'Neon-soaked melancholy. Slow-motion longing in tight corridors. Deep reds, sick greens, warm golds bleeding through celluloid. Time as texture, color as emotion.',
    key_practitioners: ['Wong Kar-wai', 'Christopher Doyle', 'Park Chan-wook'],
    keywords: ['neon', 'melancholy', 'saturated', 'slow', 'longing', 'atmospheric'],
  },
  {
    id: 'film_noir_visual',
    name: 'Film Noir',
    region: 'North America / Europe',
    country: 'USA / France',
    era_start: 1941,
    era_end: 1958,
    parent_id: null,
    hex_palette: ['#1C1C1C', '#F5F5F5', '#191970', '#B8941E', '#8B0000'],
    cultural_context: 'Shadow as storytelling. High contrast, venetian blind stripes, rain-slicked streets. German Expressionist lighting meets American cynicism.',
    key_practitioners: ['Billy Wilder', 'Fritz Lang', 'John Huston', 'Jacques Tourneur'],
    keywords: ['shadow', 'contrast', 'urban', 'nocturnal', 'cynical', 'dramatic'],
  },

  // ═══════════════════════════════════════════════════════════════
  // GRAPHICS + DESIGN
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'mid_century_modern_graphic',
    name: 'Mid-Century Modern Graphics',
    region: 'North America / Europe',
    country: 'USA',
    era_start: 1945,
    era_end: 1969,
    parent_id: null,
    hex_palette: ['#FF6347', '#1C1C1C', '#20B2AA', '#FFFDD0', '#FF0000'],
    cultural_context: 'Bold flat shapes, limited color palettes, maximum impact. Movie posters, corporate identity, album covers. Design as cultural force. Economy of form.',
    key_practitioners: ['Saul Bass', 'Paul Rand', 'Charley Harper', 'Alexander Girard'],
    keywords: ['flat', 'bold', 'poster', 'identity', 'economical', 'iconic'],
  },
  {
    id: 'psychedelic_art',
    name: 'Psychedelic Art',
    region: 'North America / Europe',
    country: 'USA / United Kingdom',
    era_start: 1965,
    era_end: 1972,
    parent_id: null,
    hex_palette: ['#8B008B', '#FF1493', '#32CD32', '#FF6B00', '#C5A028'],
    cultural_context: 'Consciousness expansion made visible. Swirling forms, electric color, Art Nouveau revival through LSD lens. Concert posters as sacred objects. Purple as gateway.',
    key_practitioners: ['Wes Wilson', 'Victor Moscoso', 'Martin Sharp', 'Peter Max'],
    keywords: ['swirling', 'electric', 'consciousness', 'purple', 'poster', 'vibrant'],
  },
  {
    id: 'soviet_constructivism',
    name: 'Soviet Constructivism',
    region: 'Europe',
    country: 'Russia / USSR',
    era_start: 1913,
    era_end: 1935,
    parent_id: null,
    hex_palette: ['#CC0000', '#1C1C1C', '#F5F5F5', '#808080', '#B89626'],
    cultural_context: 'Art in service of revolution. Geometric precision, photomontage, dynamic diagonals. The poster as weapon, the book as architecture. Utopian design for a new society.',
    key_practitioners: ['Alexander Rodchenko', 'El Lissitzky', 'Varvara Stepanova', 'Gustav Klutsis'],
    keywords: ['revolution', 'photomontage', 'diagonal', 'red', 'geometric', 'poster'],
  },
  {
    id: 'memphis_design',
    name: 'Memphis Design',
    region: 'Europe',
    country: 'Italy',
    era_start: 1981,
    era_end: 1987,
    parent_id: null,
    hex_palette: ['#FF69B4', '#00CED1', '#FFD700', '#FF6347', '#9370DB'],
    cultural_context: 'Anti-good-taste design. Clashing colors, squiggle patterns, laminate surfaces, asymmetric forms. Postmodern rebellion against Bauhaus sobriety. Fun as ideology.',
    key_practitioners: ['Ettore Sottsass', 'Michele De Lucchi', 'Nathalie Du Pasquier', 'George Sowden'],
    keywords: ['clashing', 'squiggle', 'postmodern', 'playful', 'asymmetric', 'anti-taste'],
  },

  // ═══════════════════════════════════════════════════════════════
  // FASHION (beyond existing Helmut Lang + Sade)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'dark_romanticism_fashion',
    name: 'Dark Romanticism / Avant-Garde Fashion',
    region: 'Europe',
    country: 'United Kingdom / Belgium / USA',
    era_start: 1992,
    era_end: null,
    parent_id: null,
    hex_palette: ['#1C1C1C', '#8B0000', '#F5F0E6', '#4A4A4A', '#C4A23C'],
    cultural_context: 'Fashion as existential statement. Dark beauty, skeletal structures, gothic Victorian undercurrents. Luxury through rawness. Death and desire as material.',
    key_practitioners: ['Alexander McQueen', 'Rick Owens', 'Rei Kawakubo', 'Ann Demeulemeester'],
    keywords: ['dark', 'gothic', 'skeletal', 'romantic', 'raw', 'avant-garde'],
  },

  // ═══════════════════════════════════════════════════════════════
  // DIGITAL + CONTEMPORARY
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'post_internet_art',
    name: 'Post-Internet Art',
    region: 'Global',
    country: 'Global',
    era_start: 2008,
    era_end: null,
    parent_id: null,
    hex_palette: ['#7B2FBE', '#00FFFF', '#FF00FF', '#1C1C1C', '#4169E1'],
    cultural_context: 'Art made in awareness of the network. Screen aesthetics rendered physical. Neon gradients, rendering artifacts, 3D objects in white voids. Digital as natural.',
    key_practitioners: ['Hito Steyerl', 'Amalia Ulman', 'Jon Rafman', 'Petra Cortright'],
    keywords: ['screen', 'digital', 'neon', 'gradient', 'render', 'network'],
  },
];

// ═══════════════════════════════════════════════════════════════
// LOOKUP FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all movements
 */
function getAllMovements() {
  return movements;
}

/**
 * Get movement by ID
 */
function getMovementById(id) {
  return movements.find(m => m.id === id) || null;
}

/**
 * Get movements by region
 */
function getMovementsByRegion(region) {
  return movements.filter(m =>
    m.region.toLowerCase().includes(region.toLowerCase())
  );
}

/**
 * Get movements active during a specific decade
 */
function getMovementsByEra(year) {
  return movements.filter(m =>
    m.era_start <= year && (m.era_end === null || m.era_end >= year)
  );
}

/**
 * Convert hex to LAB color space for perceptual distance
 */
function hexToLab(hex) {
  // Hex → RGB
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  // RGB → XYZ (sRGB linearization)
  const linearize = (c) => c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92;
  const rl = linearize(r), gl = linearize(g), bl = linearize(b);

  const x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047;
  const y = (rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750) / 1.00000;
  const z = (rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) / 1.08883;

  // XYZ → LAB
  const f = (t) => t > 0.008856 ? Math.pow(t, 1/3) : (7.787 * t) + 16/116;
  const L = (116 * f(y)) - 16;
  const A = 500 * (f(x) - f(y));
  const B = 200 * (f(y) - f(z));

  return { L, A, B };
}

/**
 * CIEDE2000-simplified color distance in LAB space
 */
function colorDistance(lab1, lab2) {
  const dL = lab1.L - lab2.L;
  const dA = lab1.A - lab2.A;
  const dB = lab1.B - lab2.B;
  return Math.sqrt(dL * dL + dA * dA + dB * dB);
}

/**
 * Find the closest movement to a given hex color
 * Returns sorted array of { movement, distance, matchedHex }
 */
function findMovementsByColor(hex, limit = 5) {
  const targetLab = hexToLab(hex);
  const results = [];

  for (const m of movements) {
    let bestDist = Infinity;
    let bestHex = '';

    for (const mHex of m.hex_palette) {
      const dist = colorDistance(targetLab, hexToLab(mHex));
      if (dist < bestDist) {
        bestDist = dist;
        bestHex = mHex;
      }
    }

    results.push({
      movement: m,
      distance: bestDist,
      matchedHex: bestHex,
    });
  }

  results.sort((a, b) => a.distance - b.distance);
  return results.slice(0, limit);
}

/**
 * Match a full palette (array of hex colors) to movements
 * Returns weighted movement affinities
 */
function matchPaletteToMovements(palette, limit = 8, boosts = {}) {
  const movementScores = {};

  for (const hex of palette) {
    // Top 5 per color (not 3) — prevents array-order bias when
    // many movements share similar hex codes like #DAA520
    const matches = findMovementsByColor(hex, 5);
    for (const match of matches) {
      const id = match.movement.id;
      // Inverse distance as score (closer = higher)
      const score = 1 / (1 + match.distance);
      if (!movementScores[id]) {
        movementScores[id] = {
          movement: match.movement,
          totalScore: 0,
          matchCount: 0,
          matchedColors: [],
          boosted: false,
        };
      }
      movementScores[id].totalScore += score;
      movementScores[id].matchCount += 1;
      movementScores[id].matchedColors.push({
        userHex: hex,
        movementHex: match.matchedHex,
        distance: match.distance,
      });
    }
  }

  // Apply Project DNA boosts — references and lineage from the creator's
  // actual projects act as high-signal amplifiers for matching movements
  for (const [id, boost] of Object.entries(boosts)) {
    if (movementScores[id]) {
      movementScores[id].totalScore += boost;
      movementScores[id].boosted = true;
    } else {
      // Movement not matched by color but strongly referenced in DNA —
      // inject it with the boost as its base score
      const movement = movements.find(m => m.id === id);
      if (movement && boost >= 0.2) {
        movementScores[id] = {
          movement,
          totalScore: boost,
          matchCount: 0,
          matchedColors: [],
          boosted: true,
        };
      }
    }
  }

  return Object.values(movementScores)
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, limit)
    .map(entry => ({
      ...entry,
      affinity: Math.min(1, entry.totalScore / palette.length),
    }));
}

/**
 * Generate hex color recommendations based on movement affinity
 * "You're using X, try Y which [practitioner] used in [movement]"
 */
function generateColorRecommendations(userPalette, topMovements) {
  const recommendations = [];
  const userLabs = userPalette.map(h => ({ hex: h, lab: hexToLab(h) }));

  for (const entry of topMovements.slice(0, 3)) {
    const m = entry.movement;

    for (const mHex of m.hex_palette) {
      const mLab = hexToLab(mHex);

      // Find the user color closest to this movement color
      let closestUser = null;
      let closestDist = Infinity;
      for (const u of userLabs) {
        const d = colorDistance(u.lab, mLab);
        if (d < closestDist) {
          closestDist = d;
          closestUser = u;
        }
      }

      // Only recommend if there's a meaningful but not identical match
      if (closestDist > 8 && closestDist < 60) {
        recommendations.push({
          currentHex: closestUser.hex,
          suggestedHex: mHex,
          distance: closestDist,
          movement: m.name,
          era: `${m.era_start}${m.era_end ? '-' + m.era_end : '+'}`,
          region: m.region,
          practitioner: m.key_practitioners[0],
          context: m.cultural_context.split('.')[0],
          reason: `You're using ${closestUser.hex}. Check out ${mHex} from ${m.name} (${m.region}, ${m.era_start}${m.era_end ? '-' + m.era_end : '+'}). ${m.key_practitioners[0]} worked within this tradition.`,
        });
      }
    }
  }

  // Sort by distance (closest first = most natural shift)
  return recommendations
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5);
}

/**
 * Generate movement boosts from Project DNA.
 * References and lineage from the creator's actual projects
 * act as high-conviction signals — what someone builds reveals taste.
 *
 * @param {object} projectDna - from projectDnaService.getProjectDNA()
 * @returns {object} - { movementId: boostScore }
 */
function getProjectDnaBoosts(projectDna) {
  if (!projectDna) return {};

  const boosts = {};
  const refs = projectDna.coreIdentity?.references || [];
  const lineage = projectDna.expansionVectors?.lineage || [];
  const domains = projectDna.coreIdentity?.domains || [];
  const allText = [...refs, ...lineage, ...domains].join(' ').toLowerCase();

  for (const m of movements) {
    let boost = 0;

    // Check if any practitioner is directly referenced in DNA
    for (const p of m.key_practitioners) {
      // Match on last name (most distinctive) or full name
      const lastName = p.toLowerCase().split(' ').pop();
      const fullName = p.toLowerCase();
      if (allText.includes(fullName) || (lastName.length > 3 && allText.includes(lastName))) {
        boost += 0.3;
      }
    }

    // Check keyword overlap between DNA text and movement keywords
    for (const kw of m.keywords) {
      if (kw.length > 3 && allText.includes(kw.toLowerCase())) {
        boost += 0.05;
      }
    }

    // Check movement name itself
    if (allText.includes(m.name.toLowerCase())) {
      boost += 0.25;
    }

    if (boost > 0) {
      boosts[m.id] = Math.min(boost, 0.6); // Cap per movement
    }
  }

  return boosts;
}

module.exports = {
  getAllMovements,
  getMovementById,
  getMovementsByRegion,
  getMovementsByEra,
  findMovementsByColor,
  matchPaletteToMovements,
  generateColorRecommendations,
  getProjectDnaBoosts,
  hexToLab,
  colorDistance,
};
