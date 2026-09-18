"""Hareline hero asset recipe. Named pivots are the runtime animation contract."""
import math
from common import material, group, sphere, box, torus, tube
from sculpt import bonnet, cockpit, grille


def build_kart(weight='light'):
    paint = material('Paint', '#28bfd4', .24, .18)
    accent = material('Accent', '#ffbf60', .32, .12)
    fur = material('Fur', '#f2e1bc', .82)
    cream = material('Ivory', '#fff4de', .72)
    pink = material('EarPink', '#db8398', .68)
    rubber = material('Rubber', '#1e2936', .9)
    metal = material('Alloy', '#aebbc5', .3, .65)
    dark = material('Obsidian', '#112331', .32)
    glass = material('Lens', '#3995a7', .12, .25)
    lamp = material('Headlight', '#ffebaf', .3, 0, .5)
    leather = material('Leather', '#714a34', .65)
    iris = material('Iris', '#955819', .38)
    root = group('HarelineKart')
    chassis = group('Suspension', parent=root)
    width = 1.12 if weight == 'heavy' else 1 if weight == 'medium' else .94
    box('Undertray', (0, 0, .29), (1.64 * width, 2.48, .22), rubber, chassis)
    sphere('Sculpted monocoque', (0, .1, .5), (.77 * width, 1.29, .28), paint, chassis)
    bonnet(chassis, paint, cream, weight)
    cockpit(chassis, leather, metal, paint)
    grille(chassis, accent, dark, metal)
    box('Front splitter', (0, 1.25, .36), (1.48 * width, .28, .12), dark, chassis, .045)
    box('Front bumper', (0, 1.29, .49), (1.27 * width, .18, .18), accent, chassis)
    box('Seat cushion', (0, -.31, .78), (.64, .6, .15), dark, chassis)
    box('Quilted seat', (0, -.64, 1.02), (.72, .18, .72), dark, chassis)
    for side in (-1, 1):
        sphere('Headlamp', (side * .48, 1.285, .64), (.18, .075, .08), lamp, chassis)
        box('Side sill', (side * .66 * width, -.16, .52), (.3, .96, .25), accent, chassis)
        for y in (-.83, .85):
            sphere('Wheel fairing', (side * .8 * width, y, .66), (.28, .46, .18), paint, chassis)
            pivot = group(f'Wheel_{"L" if side < 0 else "R"}{"F" if y > 0 else "B"}', (side * .88 * width, y, .36), chassis)
            p = (side * .88 * width, y, .36)
            torus('Tyre', p, .245, .105, rubber, pivot, (0, math.pi / 2, 0), 24)
            for ring in (-.052, .052):
                torus('Tyre groove', (p[0] + ring, y, .36), .324, .009, dark, pivot, (0, math.pi / 2, 0))
            outer = p[0] + side * .104
            torus('Alloy rim', (outer, y, .36), .194, .025, metal, pivot, (0, math.pi / 2, 0))
            sphere('Wheel hub', (outer, y, .36), (.035, .08, .08), accent, pivot, 16, 8)
            for spoke in range(5):
                a = spoke / 5 * math.tau
                tube('Spoke', [(outer, y, .36), (outer, y + math.sin(a) * .18, .36 + math.cos(a) * .18)], .019, metal, pivot)
        tube('Exhaust', [(side * .56, -.6, .37), (side * .65, -1.13, .44), (side * .65, -1.35, .61)], .063, metal, chassis)
        torus('Exhaust mouth', (side * .65, -1.35, .61), .06, .013, dark, chassis, (math.pi / 3, 0, 0), 16)
    if weight != 'light':
        for side in (-1, 1):
            box('Spoiler mount', (side * .54, -1.07, .83), (.07, .13, .6), metal, chassis, .02)
        box('Rear wing', (0, -1.1, 1.12), (1.65 * width, .35, .1), accent, chassis, .035)
    if weight == 'heavy':
        for side in (-1, 1):
            tube('Roll hoop', [(side * .63, -.75, .8), (side * .63, -.85, 1.3), (side * .4, -.9, 1.5)], .04, metal, chassis)

    # Deliberately large expressive face and tactile, non-furry silhouette.
    sphere('Flight suit', (0, -.26, 1.16), (.35, .3, .46), paint, chassis)
    sphere('Bib', (0, .005, 1.19), (.22, .055, .29), cream, chassis)
    torus('Collar', (0, -.24, 1.5), .19, .045, dark, chassis)
    sphere('Tail', (0, -.66, 1.02), (.2, .18, .19), cream, chassis)
    head = group('Head', (0, -.2, 1.9), chassis)
    sphere('Head sculpt', (0, -.19, 1.94), (.44, .36, .43), fur, head)
    for side in (-1, 1):
        sphere('Cheek', (side * .17, .145, 1.8), (.19, .12, .14), cream, head)
        sphere('Eye white', (side * .205, .102, 2.06), (.145, .125, .17), cream, head)
        sphere('Iris', (side * .196, .209, 2.065), (.096, .042, .116), iris, head)
        sphere('Pupil', (side * .196, .241, 2.065), (.058, .02, .08), dark, head)
        sphere('Catchlight', (side * .196 - .022, .246, 2.105), (.027, .013, .035), cream, head, 12, 8)
        tube('Eyebrow', [(side * .09, .14, 2.23), (side * .22, .13, 2.255), (side * .32, .07, 2.21)], .022, leather, head)
        for i in range(3):
            tuft = sphere('Cheek fur tuft', (side * (.32 + i * .023), .04 - i * .016, 1.83 + i * .06), (.16, .15, .075), fur, head, 16, 8)
            tuft.rotation_euler.y = side * .25
        ear = group('Ear_L' if side < 0 else 'Ear_R', (side * .23, -.23, 2.22), head)
        sphere('Ear shell', (side * .31, -.24, 2.64), (.135, .12, .5), fur, ear)
        sphere('Ear inset', (side * .31, -.126, 2.66), (.079, .02, .36), pink, ear)
        tube('Arm sleeve', [(side * .24, -.21, 1.38), (side * .37, .03, 1.21), (side * .3, .36, 1.2)], .11, paint, chassis)
        sphere('Glove', (side * .26, .37, 1.2), (.115, .14, .1), fur, chassis)
        sphere('Foot', (side * .23, .3, .86), (.12, .22, .115), fur, chassis)
        for toe in (-1, 0, 1):
            sphere('Toe', (side * .23 + toe * .056, .49, .86), (.032, .045, .05), cream, chassis, 12, 8)
    sphere('Heart nose', (0, .286, 1.91), (.071, .046, .052), pink, head)
    tube('Smile', [(-.13, .242, 1.77), (0, .277, 1.74), (.13, .242, 1.77)], .012, dark, head)
    box('Buck teeth', (0, .253, 1.725), (.085, .037, .075), cream, head, .012)
    steering = group('Steering', parent=chassis)
    torus('Steering wheel', (0, .43, 1.2), .245, .035, dark, steering, (.6, 0, 0))
    for side in (-1, 1):
        tube('Steering spoke', [(0, .43, 1.2), (side * .23, .43, 1.2)], .019, metal, steering)
    goggles = group('Accessory_goggles', parent=head)
    for side in (-1, 1):
        sphere('Goggle frame', (side * .2, .02, 2.29), (.19, .09, .125), accent, goggles)
        sphere('Goggle glass', (side * .2, .1, 2.29), (.14, .025, .08), glass, goggles)
    tube('Goggle strap', [(-.38, -.05, 2.24), (0, -.49, 2.22), (.38, -.05, 2.24)], .035, dark, goggles)
    cap = group('Accessory_cap', parent=head)
    sphere('Racing cap', (0, -.18, 2.26), (.45, .36, .17), paint, cap)
    box('Cap visor', (0, .18, 2.24), (.68, .42, .04), accent, cap, .06)
    bow = group('Accessory_bow', parent=head)
    for side in (-1, 1):
        sphere('Silk bow loop', (side * .15, .02, 2.29), (.16, .08, .12), accent, bow)
    sphere('Bow knot', (0, .06, 2.29), (.065, .06, .07), paint, bow)
    cap.hide_render = bow.hide_render = True
    return root
