"""Canned flavor pools — first-class content, not an error state.

The game is 100% playable with the LLM down; these lines are authored
flavor, not placeholders. >=30 hand-written lines per kind (lore /
epitaph / run), original HALLWAKE horror. Pick is deterministic:
index = (door + sum(ord(ch) for ch in kind)) % len(pool) — same request,
same line, every time (no salted hash()).
"""

LORE = [
    "The porter's log says this room was sealed after the second bell. Nobody rang a second bell.",
    "Stripes on the wallpaper count themselves wrong when you look away. They know you noticed.",
    "The kettle here still whistles at 3 a.m. for a guest who never checked in.",
    "Someone chalked a tally on the doorframe, then chalked it out, then chalked it back.",
    "The mirror faces the wall. The wall has started facing back.",
    "Dust lies thick here, except along one path of footprints that stop mid-stride.",
    "The radiator knocks in morse. The message is just your door number.",
    "Housekeeping left the bed made on the wrong side — as if slept in from the ceiling.",
    "The sconce flame leans toward the exit even when the window is open.",
    "A name tag hangs by the door. The name changes spelling each time you read it.",
    "The floorboard near the wardrobe takes a breath. Just one. Just enough.",
    "The clock here runs, but only while you are not watching it.",
    "There is a chair angled at the bed. It was not angled at the bed a moment ago.",
    "The wallpaper pattern repeats every nine inches. The gap between the last two is ten.",
    "A moth circles the lamp though the windows are painted shut.",
    "The drawer opens to a second drawer, smaller. It opens to a third. Stop there.",
    "The room smells of pipe smoke and rain, though the hotel banned both in 1911.",
    "The bedspread has a seam unpicked the length of a hand. Something left through it.",
    "The door number was repainted. The old number still shows in the dark, like a bruise.",
    "The rug is worn thin in a circle. Whatever wore it never stepped forward or back.",
    "The key in this lock is warm, as if the last guest just handed it over.",
    "The window shows the same courtyard as the last room, down to the same cracked pane.",
    "The telephone off the hook dials, clicks, and then listens to you.",
    "Someone wrote a to-do list on the glass: WAKE. WALK. DON'T. The last word is underlined twice.",
    "The lamp flickers in a rhythm. Count it: it matches your breathing, one beat ahead.",
    "The guest book here has your signature on a page dated last year.",
    "The room is cold except for one chair, which is body-warm and rocking faintly.",
    "The ceiling stain has a face today. Yesterday it did not. Tomorrow it will again.",
    "The wardrobe hums a lullaby in a key below hearing. Your teeth feel it first.",
    "The porter left a card: 'We regret the disturbance.' There is no disturbance. Yet.",
    "The bathwater drained black, then clear, then black again, in the order of your regrets.",
    "The doorframe is taller on the inside. You measured. You should not have measured.",
]

EPITAPH = [
    "The porter notes your arrival as permanent. Tip included.",
    "You learned the layout the way all guests do: from the inside.",
    "The lantern went out mid-sentence. The sentence is still going.",
    "You were so close. The corridor agrees. The corridor is lying.",
    "Somewhere a chalk tally gains a stroke and a name it cannot pronounce.",
    "The house rules say no running. The house rules did not apply to you anymore.",
    "You checked out early. The hotel checks you in again at dawn.",
    "The dark here is patient. You were, briefly, less so.",
    "Your oil ran dry at the exact moment the walls leaned in. They always lean in then.",
    "The GAUNT carries your lantern now. It looks surprised by how light it is.",
    "You chose the wrong door with such confidence that the right one flinched.",
    "The night porter is writing this down. He will read it aloud later, fondly.",
    "You made it to the good part of the hall. The good part is where it keeps the rest.",
    "The sconces relit themselves one by one as you fell. Housekeeping, mostly.",
    "Your epitaph is being drafted by something with too many hands and not enough practice.",
    "You walked into a whisper and stayed for the whole conversation.",
    "The hotel regrets all inconvenience caused by your ending.",
    "You counted the doors honestly. The doors did not return the favor.",
    "The chalk mark by the elevator now has your height next to it.",
    "You were brave for four more doors than most. The hotel measures bravery in doors.",
    "The dark opened for you like a door. It was never a door.",
    "Your room number has been reassigned. The new guest is already nervous.",
    "You kept the flame low and the pace high. The math caught up eventually.",
    "The MURMUR says you were a good listener. It says so to everyone, right before.",
    "You reached the checkpoint in spirit only. Spirit does not clock in.",
    "The hotel thanks you for your visit and has kept the receipt.",
    "You stood still when you should have run, and ran when the hall wanted stillness.",
    "Your name is in the guest book twice now. The second time is in a hand you do not own.",
    "The finale was beautiful. You got a preview. Previews are not tickets.",
    "The porter will find your lantern at closing. He always finds the lanterns.",
    "You died two doors short of the exit. The two doors are still there, smug.",
    "The tally marks on the frame spell your initials now. Coincidence, mostly.",
]

RUN = [
    "Twenty-four doors, and every one of them opened for you. Suspicious, but earned.",
    "The porter tips his cap. The cap is on a coat that has no wearer. Still, respect.",
    "You walked the whole hall and the hall is still deciding whether you did.",
    "The chalk tallies have stopped counting you. That is either freedom or a promotion.",
    "Your oil lasted longer than your nerve. Nerve is the cheaper fuel. Well spent.",
    "The exit door opened like it knew you. Doors here only do that for staff.",
    "You kept the flame up and the pace honest. The hotel hates honest. It let you go anyway.",
    "The night shift ends for you at dawn. The other shift does not end at all.",
    "You checked out with all your names intact. Most guests leave one or two at the desk.",
    "The GAUNT swept your alcove and found it politely occupied. It has never forgotten.",
    "You read the chalk, chose the real door, and lived to gloat. The frame is furious.",
    "The MURMUR followed your light like a good dog. Bad dog. You kept walking. Correct.",
    "You relit the sconces in the scratch order with steady hands. Housekeeping is impressed.",
    "The boiler room forgives you. The boiler room forgives everyone. That is the trap.",
    "You carried a dying flame through the finale and it died last. That is the whole trick.",
    "The ledger says you survived. The ledger also says the hall is longer today. Odd.",
    "You were dead four times and out once. The math is embarrassing and the result is real.",
    "You were dead once and out clean. The porter writes 'unusual' and underlines it.",
    "You were dead zero times. The other guests will not believe it. Wear it anyway.",
    "You took the long way and lived. The hall rewards tourists and eats sprinters.",
    "You barely made it. The door closed a heartbeat after you. It wanted to close on you.",
    "You strolled. In this hotel, strolling is a flex. The flex is valid.",
    "Your oil gauge spent the finale red. Red is a color the hall respects.",
    "You kept every checkpoint and lost nothing at the desk. A rare audit outcome.",
    "The sconces remember your hands. They will wait for them again tomorrow.",
    "You banished the blue flame with a scratch order only the old logs knew.",
    "You walked the sweep path and stood still while it passed. Stone-cold. Logged.",
    "The finale threw both of its worst at you and you answered with a lantern. Good trade.",
    "You left through the front door at dawn. The front door has never done that before.",
    "The guest book closes on your name with a stamp: WOKEN. It is the only stamp it has.",
    "You made the whole hall say your door number in the right order. That is the score.",
    "The hotel is quiet now. Quiet, here, is applause.",
]

POOLS = {"lore": LORE, "epitaph": EPITAPH, "run": RUN}


def pick(kind: str, door: int) -> str:
    """Deterministic line for (kind, door). Same inputs -> same line, always."""
    pool = POOLS[kind]
    idx = (door + sum(ord(ch) for ch in kind)) % len(pool)
    return pool[idx]
