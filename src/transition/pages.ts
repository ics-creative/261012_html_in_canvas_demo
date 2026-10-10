/** ページ遷移の対象となるHTML誌面。 */
export const pages = [
  {
    id: "01",
    name: "Paris",
    image: "images/photos/P3171021.jxl",
    description: "Tree-lined avenues, pale rooftops and the skyline beyond.",
    sections: [
      {
        title: "Along the avenue",
        body: "Two rows of trees run through the centre of the photograph. The road narrows towards the distant towers, giving the view a clear direction. On either side, blocks of pale buildings follow the streets away from this central line.",
      },
      {
        title: "Above the rooftops",
        body: "From street level, each building has a separate entrance and facade. From here, the roofs form a continuous surface. Chimneys, dormer windows and small courtyards interrupt the pattern, while the trees make the main avenue easy to follow.",
      },
      {
        title: "The distant skyline",
        body: "Glass towers rise beyond the lower buildings in the foreground. Their vertical edges contrast with the long avenue and the shallow rooflines. A little haze softens the most distant details without hiding the difference between the two parts of the city.",
      },
    ],
  },
  {
    id: "02",
    name: "Gardens",
    image: "images/photos/BF_06794.jxl",
    description: "Clipped hedges and circular beds beside a long stretch of water.",
    sections: [
      {
        title: "Paths and planting",
        body: "Straight paths divide the garden into small planted sections. Curved beds sit inside these boundaries, with clipped hedges tracing their edges. The view from above brings the whole arrangement into focus, including the narrow spaces between one bed and the next.",
      },
      {
        title: "Rows of trees",
        body: "Small trees stand in evenly spaced rows along the paths. Their shadows fall across the pale ground and separate each trunk from the next. Taller trees beyond the garden create a much less regular edge at the back of the photograph.",
      },
      {
        title: "Beyond the beds",
        body: "The water stretches across the background, bordered by a dense line of trees. Its broad, level surface contrasts with the detailed planting nearby. The photograph includes both scales: individual beds in the foreground and the wider landscape beyond them.",
      },
    ],
  },
  {
    id: "03",
    name: "Coast",
    image: "images/photos/P3233004.jxl",
    description: "Mont Saint-Michel across wet sand and shallow water.",
    sections: [
      {
        title: "Across the sand",
        body: "Wet sand fills most of the foreground. Small channels lead towards the island, and thin patches of water reflect the sky. With no buildings close to the camera, the open beach makes the compact outline of Mont Saint-Michel stand out.",
      },
      {
        title: "One compact skyline",
        body: "Stone buildings climb towards the tallest part of the island. From this distance, separate roofs become a single stepped silhouette. The dark base meets the pale sand along a low horizontal edge, while the upper buildings rise into the sky.",
      },
      {
        title: "Clouds and reflections",
        body: "Large white clouds cross the blue sky above the island. Their reflections are broken by the ripples and marks in the sand. The bright upper part of the photograph and the darker wet beach meet around the small cluster of buildings on the horizon.",
      },
    ],
  },
] as const;

/** レーザーで切り替える、セーヌ川の夕景と夜景の誌面。 */
export const laserPages = [
  {
    id: "01",
    name: "Dusk",
    image: "images/photos/P3324490.jxl",
    description: "The Eiffel Tower beside the Seine as the daylight fades.",
    sections: [
      {
        title: "The river at sunset",
        body: "A warm band of light remains near the horizon, beneath thin layers of cloud. The river carries the same colours through the centre of the photograph. The Eiffel Tower is still a dark outline, with the trees along the banks darker again.",
      },
      {
        title: "Between the banks",
        body: "The two banks lead towards the low bridge in the distance. Boats interrupt the open surface of the water, leaving small changes in its reflection. The tower stands to one side, allowing the river to remain the main route through the picture.",
      },
      {
        title: "Before the lights",
        body: "There is enough daylight to see the trees and the shape of each boat. A few lights are beginning to show along the water. Later photographs from the river reveal how these small points become much more prominent as the sky darkens.",
      },
    ],
  },
  {
    id: "02",
    name: "Blue hour",
    image: "images/photos/P3324910.jxl",
    description: "Gold lights on the tower, blue water and a narrow pink horizon.",
    sections: [
      {
        title: "The tower lights up",
        body: "The tower is now illuminated from base to tip. Its warm light stands against the deep blue sky, while a little pink remains above the horizon. The change is visible across the whole scene, from the tower to the reflections beneath the bridge.",
      },
      {
        title: "Reflections on the Seine",
        body: "Lights along the bank make broken yellow lines on the water. Each reflection stretches towards the camera and changes shape with the ripples. The darker parts between them still carry the blue of the sky, keeping the two colours distinct.",
      },
      {
        title: "A changing sky",
        body: "Clouds retain a little colour after the sun has gone below the horizon. Their broad horizontal bands contrast with the narrow tower. A boat passes through the middle distance, adding another small shape between the bright banks and the dark water.",
      },
    ],
  },
  {
    id: "03",
    name: "Night",
    image: "images/photos/P3325232.jxl",
    description: "An illuminated tower and a passing boat recorded across the water.",
    sections: [
      {
        title: "After dark",
        body: "The sky has lost most of its colour, making the tower the brightest large shape in the photograph. Trees frame it from below and from the right. The light on the river follows a different pattern, spreading into long streaks close to the camera.",
      },
      {
        title: "A boat in motion",
        body: "The passing boat is recorded as a broad band of white and blue light. Nearby buildings and the tower keep their sharp edges. These two kinds of detail sit together in the same frame: a fixed skyline and the path of something moving across it.",
      },
      {
        title: "Light on the bank",
        body: "Small lights beneath the tower mark the riverbank. Their reflections are short near the far shore and longer in the foreground. The dark trees separate these points from the much larger illuminated structure, giving the night view a clear outline.",
      },
    ],
  },
] as const;

/** 誌面とURLを対応させる識別子。 */
export type PageId = (typeof pages)[number]["id"];
