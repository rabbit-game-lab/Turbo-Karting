"""Track hero pieces, authored as parameterized Blender meshes with shared materials."""
import math
from common import group, sphere, box, torus, tube, material, rock, cone


def build_landmark(theme):
    root = group(f'Landmark_{theme}')
    ivory = material('GateIvory', '#fff0d6', .65)
    wood = material('Timber', '#734936', .9)
    mint = material('GateMint', '#48ae98', .5)
    gold = material('GateGold', '#ffc15b', .35, .1)
    if theme == 'meadow':
        for side in (-1, 1):
            box('Gate foot', (side * 10, 0, .6), (2.8, 3, 1.2), ivory, root, .3)
            box('Timber tower', (side * 10, 0, 4), (1.8, 1.9, 7), ivory, root, .18)
            for offset in (-.8, .8):
                box('Teal tower beam', (side * 10 + offset, 1, 4), (.19, .18, 7.2), mint, root, .025)
            for height in (1.2, 3.2, 5.2, 7.3):
                box('Painted collar', (side * 10, 0, height), (1.65, 1.7, .35), mint, root)
            cone('Teal tower roof', (side * 10, 0, 9), 1.8, 3.1, mint, root)
            sphere('Golden finial', (side * 10, 0, 10.8), (.35, .35, .45), gold, root)
        tube('Arch frame', [(-10, 0, 7.7), (-5, 0, 10), (0, 0, 10.8), (5, 0, 10), (10, 0, 7.7)], .38, mint, root)
        box('Finish banner', (0, 0, 8), (17.7, .55, 1.5), ivory, root, .22)
        for i in range(24):
            for row in range(2):
                if (i + row) % 2 == 0:
                    box('Checker', (-8.3 + i * .72, .3, 7.64 + row * .72), (.7, .05, .7), wood, root, .01)
        sphere('Rabbit crest', (0, .1, 10.7), (1.1, .4, 1), gold, root)
        for side in (-1, 1):
            sphere('Crest ear', (side * .48, .1, 12), (.3, .27, 1.05), gold, root)
            sphere('Crest cheek', (side * .32, .43, 10.5), (.42, .24, .3), gold, root)
            sphere('Crest eye', (side * .33, .47, 10.98), (.12, .06, .18), wood, root)
        torus('Medallion frame', (0, 0, 10.7), 1.45, .12, gold, root, (math.pi / 2, 0, 0))
    elif theme == 'desert':
        layers = [material(f'Sandstone{i}', c, .96) for i, c in enumerate(('#ad6745', '#c78051', '#dc9f6a', '#a95e46'))]
        for side in (-1, 1):
            for i in range(7):
                rock('Stratified pillar', (side * (12 - i * .28), 0, i * 2), (4.4 - i * .23, 5 - i * .23, 1.6), layers[i % 4], root, i)
        for i in range(11):
            a = i / 10 * math.pi
            rock('Natural arch', (math.cos(a) * 10.4, 0, 12 + math.sin(a) * 3.5), (2.6, 3.7, 1.5), layers[i % 4], root, i)
        cactus = material('Cactus', '#538d6d', .9)
        for side in (-1, 1):
            tube('Saguaro', [(side * 17, -2, 0), (side * 17, -2, 5)], .55, cactus, root)
            tube('Cactus arm', [(side * 17, -2, 2.3), (side * 19, -2, 2.6), (side * 19, -2, 4.1)], .37, cactus, root)
    elif theme == 'snow':
        ice = material('Glacier', '#82c4da', .28)
        deep = material('DeepIce', '#477b9d', .45)
        water = material('Waterfall', '#96eff7', .25, 0, .35)
        for side in (-1, 1):
            for i in range(5):
                rock('Ice cliff', (side * (13 + i * 1.8), i * 2, 5 + i), (3.5, 4, 7 + i), deep if i % 2 else ice, root, i)
                sphere('Snow cap', (side * (13 + i * 1.8), i * 2, 11 + i * 2), (3.6, 4.1, 1.3), ivory, root, 12, 6)
                for tier in range(3):
                    cone('Cliff pine', (side * (13 + i * 1.8), i * 2, 13 + i * 2 + tier * .8), 1.3 - tier * .25, 2.4, ivory, root)
            for i in range(4):
                tube('Cascade ribbon', [(side * (14 + i * .4), -4, 12), (side * (14 + i * .4), -4.5, 7), (side * (14 + i * .5), -5, -7)], .19, water, root)
    else:
        metal = material('CityMetal', '#283455', .35, .3)
        pink = material('NeonPink', '#fc61ae', .3, 0, 2)
        cyan = material('NeonCyan', '#5fe7e8', .3, 0, 2)
        for y in (-6, -3, 0, 3, 6):
            for side in (-1, 1):
                box('Portal footing', (side * 10, y, .7), (2.3, 1.5, 1.4), metal, root, .2)
                box('Portal bevel pillar', (side * 10, y, 4), (1.5, 1.2, 6), metal, root, .22)
            tube('Tunnel rib', [(-10, y, 0), (-10, y, 7), (-7, y, 10), (7, y, 10), (10, y, 7), (10, y, 0)], .5, metal, root)
            tube('Neon tube', [(-9.4, y, 1), (-9.4, y, 7), (-6.7, y, 9.4), (6.7, y, 9.4), (9.4, y, 7), (9.4, y, 1)], .095, pink if y % 2 else cyan, root)
        box('Warren sign', (0, 0, 11.3), (10, .5, 2), metal, root)
        for side in (-1, 1):
            tube('Neon ears', [(side * .7, .4, 10.6), (side * 1.1, .4, 12), (side * .5, .4, 12.5), (side * .25, .4, 10.7)], .12, cyan, root)
    return root
