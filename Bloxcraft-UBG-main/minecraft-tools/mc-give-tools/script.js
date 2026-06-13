$(function () {
  let options = [];
  for (let i = 0; i <= tools.length - 1; i++) {
    $("select").append(
      `<option value="${tools[i].Id}">${tools[i].Name}</option>`
    );
  }
});

$("input[type=checkbox]").on("change", function () {
  const enchantmentId = $(this).val();
  const enchantment = enchantments.filter((x) => {
    return x.Id == enchantmentId;
  })[0];

  const conflicts = enchantment.Conflicts;
  const family = enchantment.Family;

  // If unselecting the enchantment, mark family items selectable.
  if ($(this).is(":checked")) {
    $("input[type=checkbos]:disabled").each(function (index) {
      let isFamily =
        family === undefined ? false : family.includes(_enchantment.Id);
      if (isFamily) {
        $(this).attr("disabled", false);
        $("label.en" + _enchantmentId).toggleClass("text-muted");
      }
    });
  } else {
    // If selecting the enchantment, mark family and conflicts not selectable.
    $("input[type=checkbox]:not(:checked)").each(function (index) {
      const _enchantmentId = $(this).val();
      const _enchantment = enchantments.filter((x) => {
        return x.Id == _enchantmentId;
      })[0];
      let isConflict =
        conflicts === undefined ? false : conflicts.includes(_enchantment.Id);
      let isFamily =
        family === undefined ? false : family.includes(_enchantment.Id);

      if (isConflict) {
        $(this).attr("disabled", true);
        $("label.en" + _enchantmentId).toggleClass("text-muted");
      }
      
      if (isFamily) {
        $(this).attr("disabled", true);
        $("label.en" + _enchantmentId).toggleClass("text-muted");
      }
    });
  }
});

$(".gen").on("click", function () {
  const container = $(".output");
  let cmd;
  const tool = tools.filter((x) => {
    return x.Id == $("select").val();
  })[0];
  if (tool !== null || tool !== undefined) {
    cmd = `<p onclick="copyGiveCommand();">/give @p ${tool.Code}{Enchantments:[`;
  }
  $("input[type=checkbox]:checked").each(function (index) {
    const _enchantmentId = $(this).val();
    const _enchantment = enchantments.filter((x) => {
      return x.Id == _enchantmentId;
    })[0];

    cmd += `{id:${_enchantment.Code},lvl:${_enchantment.Level}},`;
  });
  // Remove trailing comma.
  cmd = cmd.substring(0, cmd.length - 1);
  cmd += "]} 1</p>";
  container.html(cmd);
});

function copyGiveCommand() {
  console.log("copying...");
  const copy = $(".output p").html();

  navigator.clipboard.writeText(copy);
  console.log(`copied '${copy}'`);
  $(".output p").toggleClass("text-success");
}

const enchantments = [
  {
    Id: 1,
    Name: "Bane of Arthropods I",
    Code: "bane_of_arthropods",
    Level: 1,
    Family: [2, 3, 4, 5],
    Conflicts: [15, 16, 17, 18, 19, 21, 22, 23, 24, 25]
  },
  {
    Id: 2,
    Name: "Bane of Arthropods II",
    Code: "bane_of_arthropods",
    Level: 2,
    Family: [1, 3, 4, 5],
    Conflicts: [15, 16, 17, 18, 19, 21, 22, 23, 24, 25]
  },
  {
    Id: 3,
    Name: "Bane of Arthropods III",
    Code: "bane_of_arthropods",
    Level: 3,
    Family: [1, 2, 4, 5],
    Conflicts: [15, 16, 17, 18, 19, 21, 22, 23, 24, 25]
  },
  {
    Id: 4,
    Name: "Bane of Arthropods IV",
    Code: "bane_of_arthropods",
    Level: 4,
    Family: [1, 2, 3, 5],
    Conflicts: [15, 16, 17, 18, 19, 21, 22, 23, 24, 25]
  },
  {
    Id: 5,
    Name: "Bane of Arthropods V",
    Code: "bane_of_arthropods",
    Level: 5,
    Family: [1, 2, 3, 4],
    Conflicts: [15, 16, 17, 18, 19, 21, 22, 23, 24, 25]
  },
  {
    Id: 6,
    Name: "Efficiency I",
    Code: "efficiency",
    Level: 1,
    Family: [7, 8, 9, 10],
    Conflicts: []
  },
  {
    Id: 7,
    Name: "Efficiency II",
    Code: "efficiency",
    Level: 2,
    Family: [6, 8, 9, 10],
    Conflicts: []
  },
  {
    Id: 8,
    Name: "Efficiency III",
    Code: "efficiency",
    Level: 3,
    Family: [6, 7, 9, 10],
    Conflicts: []
  },
  {
    Id: 9,
    Name: "Efficiency IV",
    Code: "efficiency",
    Level: 4,
    Family: [6, 7, 8, 10],
    Conflicts: []
  },
  {
    Id: 10,
    Name: "Efficiency V",
    Code: "efficiency",
    Level: 5,
    Family: [6, 7, 8, 9],
    Conflicts: []
  },
  {
    Id: 11,
    Name: "Fortune I",
    Code: "fortune",
    Level: 1,
    Conflicts: [20],
    Family: [12, 13],
    Conflicts: []
  },
  {
    Id: 12,
    Name: "Fortune II",
    Code: "fortune",
    Level: 2,
    Conflicts: [20],
    Family: [11, 13],
    Conflicts: []
  },
  {
    Id: 13,
    Name: "Fortune III",
    Code: "fortune",
    Level: 3,
    Conflicts: [20],
    Family: [11, 12],
    Conflicts: []
  },
  { Id: 14, Name: "Mending", Code: "mending", Level: 1 },
  {
    Id: 15,
    Name: "Sharpness I",
    Code: "sharpness",
    Level: 1,
    Family: [16, 17, 18, 19],
    Conflicts: [1, 2, 3, 4, 5, 21, 22, 23, 24, 25]
  },
  {
    Id: 16,
    Name: "Sharpness II",
    Code: "sharpness",
    Level: 2,
    Family: [15, 17, 18, 19],
    Conflicts: [1, 2, 3, 4, 5, 21, 22, 23, 24, 25]
  },
  {
    Id: 17,
    Name: "Sharpness III",
    Code: "sharpness",
    Level: 3,
    Family: [15, 16, 18, 19],
    Conflicts: [1, 2, 3, 4, 5, 21, 22, 23, 24, 25]
  },
  {
    Id: 18,
    Name: "Sharpness IV",
    Code: "sharpness",
    Level: 4,
    Family: [15, 16, 17, 19],
    Conflicts: [1, 2, 3, 4, 5, 21, 22, 23, 24, 25]
  },
  {
    Id: 19,
    Name: "Sharpness V",
    Code: "sharpness",
    Level: 5,
    Family: [15, 16, 17, 18],
    Conflicts: [1, 2, 3, 4, 5, 21, 22, 23, 24, 25]
  },
  {
    Id: 20,
    Name: "Silk Touch",
    Code: "silk_touch",
    Level: 1,
    Conflicts: [11, 12, 13]
  },
  {
    Id: 21,
    Name: "Smite I",
    Code: "smite",
    Level: 1,
    Family: [22, 23, 24, 25],
    Conflicts: [1, 2, 3, 4, 5, 15, 16, 17, 18, 19, 22, 23, 24, 25]
  },
  {
    Id: 22,
    Name: "Smite II",
    Code: "smite",
    Level: 2,
    Family: [21, 23, 24, 25],
    Conflicts: [1, 2, 3, 4, 5, 15, 16, 17, 18, 19, 21, 23, 24, 25]
  },
  {
    Id: 23,
    Name: "Smite III",
    Code: "smite",
    Level: 3,
    Family: [21, 22, 24, 25],
    Conflicts: [1, 2, 3, 4, 5, 15, 16, 17, 18, 19, 21, 22, 24, 25]
  },
  {
    Id: 24,
    Name: "Smite IV",
    Code: "smite",
    Level: 4,
    Family: [21, 22, 23, 25],
    Conflicts: [1, 2, 3, 4, 5, 15, 16, 17, 18, 19, 21, 22, 23, 25]
  },
  {
    Id: 25,
    Name: "Smite V",
    Code: "smite",
    Level: 5,
    Family: [21, 22, 23, 24],
    Conflicts: [1, 2, 3, 4, 5, 15, 16, 17, 18, 19, 21, 22, 23, 24]
  },
  {
    Id: 26,
    Name: "Unbreaking I",
    Code: "unbreaking",
    Level: 1,
    Family: [27, 28],
    Conflicts: []
  },
  {
    Id: 27,
    Name: "Unbreaking II",
    Code: "unbreaking",
    Level: 2,
    Family: [26, 28],
    Conflicts: []
  },
  {
    Id: 28,
    Name: "Unbreaking III",
    Code: "unbreaking",
    Level: 3,
    Family: [26, 27],
    Conflicts: []
  }
];

const tools = [
  {
    Id: 1,
    Name: "Diamond Axe",
    Code: "diamond_axe",
    Valid_Enchantments: [
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28
    ]
  },
  {
    Id: 2,
    Name: "Diamond Hoe",
    Code: "diamond_hoe",
    Valid_Enchantments: [6, 7, 8, 9, 10, 11, 12, 13, 14, 20, 26, 27, 28]
  },
  {
    Id: 3,
    Name: "Diamond Pickaxe",
    Code: "diamond_pickaxe",
    Valid_Enchantments: [6, 7, 8, 9, 10, 11, 12, 13, 14, 20, 26, 27, 28]
  },
  {
    Id: 4,
    Name: "Diamond Shovel",
    Code: "diamond_shovel",
    Valid_Enchantments: [6, 7, 8, 9, 10, 11, 12, 13, 14, 20, 26, 27, 28]
  },
  {
    Id: 5,
    Name: "Golden Axe",
    Code: "golden_axe",
    Valid_Enchantments: [
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28
    ]
  },
  {
    Id: 6,
    Name: "Golden Hoe",
    Code: "golden_hoe",
    Valid_Enchantments: [6, 7, 8, 9, 10, 11, 12, 13, 14, 20, 26, 27, 28]
  },
  {
    Id: 7,
    Name: "Golden Pickaxe",
    Code: "golden_pickaxe",
    Valid_Enchantments: [6, 7, 8, 9, 10, 11, 12, 13, 14, 20, 26, 27, 28]
  },
  {
    Id: 8,
    Name: "Golden Shovel",
    Code: "golden_shovel",
    Valid_Enchantments: [6, 7, 8, 9, 10, 11, 12, 13, 14, 20, 26, 27, 28]
  },
  {
    Id: 9,
    Name: "Iron Axe",
    Code: "iron_axe",
    Valid_Enchantments: [
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28
    ]
  },
  {
    Id: 10,
    Name: "Iron Hoe",
    Code: "iron_hoe",
    Valid_Enchantments: [6, 7, 8, 9, 10, 11, 12, 13, 14, 20, 26, 27, 28]
  },
  {
    Id: 11,
    Name: "Iron Pickaxe",
    Code: "iron_pickaex",
    Valid_Enchantments: [6, 7, 8, 9, 10, 11, 12, 13, 14, 20, 26, 27, 28]
  },
  {
    Id: 12,
    Name: "Iron Shovel",
    Code: "iron_shovel",
    Valid_Enchantments: [6, 7, 8, 9, 10, 11, 12, 13, 14, 20, 26, 27, 28]
  },
  {
    Id: 13,
    Name: "Stone Axe",
    Code: "stone_axe",
    Valid_Enchantments: [
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28
    ]
  },
  {
    Id: 14,
    Name: "Stone Hoe",
    Code: "stone_hoe",
    Valid_Enchantments: [6, 7, 8, 9, 10, 11, 12, 13, 14, 20, 26, 27, 28]
  },
  {
    Id: 15,
    Name: "Stone Pickaxe",
    Code: "stone_pickaxe",
    Valid_Enchantments: [6, 7, 8, 9, 10, 11, 12, 13, 14, 20, 26, 27, 28]
  },
  {
    Id: 16,
    Name: "Stone Shovel",
    Code: "stone_shovel",
    Valid_Enchantments: [6, 7, 8, 9, 10, 11, 12, 13, 14, 20, 26, 27, 28]
  },
  {
    Id: 17,
    Name: "Wooden Axe",
    Code: "wooden_axe",
    Valid_Enchantments: [
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28
    ]
  },
  {
    Id: 18,
    Name: "Wooden Hoe",
    Code: "wooden_hoe",
    Valid_Enchantments: [6, 7, 8, 9, 10, 11, 12, 13, 14, 20, 26, 27, 28]
  },
  {
    Id: 19,
    Name: "Wooden Pickaxe",
    Code: "wooden_pickaxe",
    Valid_Enchantments: [6, 7, 8, 9, 10, 11, 12, 13, 14, 20, 26, 27, 28]
  },
  {
    Id: 20,
    Name: "Wooden Shovel",
    Code: "wooden_shovel",
    Valid_Enchantments: [6, 7, 8, 9, 10, 11, 12, 13, 14, 20, 26, 27, 28]
  },
  {
    Id: 21,
    Name: "Netherite Axe",
    Code: "netherite_axe",
    Valid_Enchantments: [
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28
    ]
  },
  {
    Id: 22,
    Name: "Netherite Hoe",
    Code: "netherite_hoe",
    Valid_Enchantments: [6, 7, 8, 9, 10, 11, 12, 13, 14, 20, 26, 27, 28]
  },
  {
    Id: 23,
    Name: "Netherite Pickaxe",
    Code: "netherite_pickaxe",
    Valid_Enchantments: [6, 7, 8, 9, 10, 11, 12, 13, 14, 20, 26, 27, 28]
  },
  {
    Id: 24,
    Name: "Netherite Shovel",
    Code: "netherite_shovel",
    Valid_Enchantments: [6, 7, 8, 9, 10, 11, 12, 13, 14, 20, 26, 27, 28]
  }
];