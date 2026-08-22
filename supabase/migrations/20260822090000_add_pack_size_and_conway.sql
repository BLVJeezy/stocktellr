ALTER TABLE public.items ADD COLUMN IF NOT EXISTS pack_size TEXT;

-- Jimmy's producten: hoeveel stuks/kg per doos
UPDATE public.items SET pack_size = '45 st./doos' WHERE category = 'jimmys' AND name = 'SUPREME CHEESE SAUS 90GR';
UPDATE public.items SET pack_size = '12 st./doos' WHERE category = 'jimmys' AND name = 'SUPREME NACHOS BARBECUE 140GR';
UPDATE public.items SET pack_size = '12 st./doos' WHERE category = 'jimmys' AND name = 'SUPREME NACHO SALTED 140GR';
UPDATE public.items SET pack_size = '45 st./doos' WHERE category = 'jimmys' AND name = 'SUPREME SALSA SAUS 90GR';
UPDATE public.items SET pack_size = '40 st./doos' WHERE category = 'jimmys' AND name = 'SUPREME FIESTOS 40G';
UPDATE public.items SET pack_size = '250 st./doos' WHERE category = 'jimmys' AND name = 'RAVIER NACHOS FOLDING TRAY REGULAR';
UPDATE public.items SET pack_size = '500 st./doos' WHERE category = 'jimmys' AND name = 'PATHE BE GOBELET SUCRE 125CL (POPCORN DOOS ZOET)';
UPDATE public.items SET pack_size = '250 st./doos' WHERE category = 'jimmys' AND name = 'PATHE BE GOBELET SUCRE 250CL (POPCORN DOOS ZOET)';
UPDATE public.items SET pack_size = '125 st./doos' WHERE category = 'jimmys' AND name = 'PATHE BE GOBELET SUCRE 500CL (POPCORN DOOS ZOET)';
UPDATE public.items SET pack_size = '500 st./doos' WHERE category = 'jimmys' AND name = 'PATHE BE GOBELET SALE 125CL (POPCORN DOOS ZOUT)';
UPDATE public.items SET pack_size = '250 st./doos' WHERE category = 'jimmys' AND name = 'PATHE BE GOBELET SALE 250CL (POPCORN DOOS ZOUT)';
UPDATE public.items SET pack_size = '250 st./doos' WHERE category = 'jimmys' AND name = 'PATHE BE GOBELET SALE 250CL (POPCORN DOOS ZOET/ZOUT MIX)';
UPDATE public.items SET pack_size = '3 kg/doos' WHERE category = 'jimmys' AND name = 'SAC POPCORN AIR POPPED SALTED JIMMY''S (POPCORN ZOUT)';
UPDATE public.items SET pack_size = '4,5 kg/doos' WHERE category = 'jimmys' AND name = 'SAC POPCORN SUCRE CLASSIC SWEET JIMMY''S (POPCORN ZOET)';
UPDATE public.items SET pack_size = '3,5 kg/doos' WHERE category = 'jimmys' AND name = 'POPCORN ZOET/ZOUT';

-- Conway dranken: nieuwe items met pack_size (LOS + TRAY per product)
INSERT INTO public.items (category, name, unit, sort_order, pack_size) VALUES
('conway','AQUARIUS BLUE 50CL','LOS',1,NULL),
('conway','AQUARIUS BLUE 50CL','TRAY',2,'24 st./tray'),
('conway','AQUARIUS LEMON 50CL','LOS',3,NULL),
('conway','AQUARIUS LEMON 50CL','TRAY',4,'24 st./tray'),
('conway','AQUARIUS ZERO LEMON','LOS',5,NULL),
('conway','AQUARIUS ZERO LEMON','TRAY',6,'24 st./tray'),
('conway','AQUARIUS RED PEACH 50CL','LOS',7,NULL),
('conway','AQUARIUS RED PEACH 50CL','TRAY',8,'24 st./tray'),
('conway','CAPRI SUN MULTIVIT','LOS',9,NULL),
('conway','CAPRI SUN MULTIVIT','TRAY',10,'4 dozen van 10x20cl'),
('conway','CAPRI SUN SINAAS','LOS',11,NULL),
('conway','CAPRI SUN SINAAS','TRAY',12,'4 dozen van 10x20cl'),
('conway','COCA COLA 50CL PET','LOS',13,NULL),
('conway','COCA COLA 50CL PET','TRAY',14,'24 st./tray'),
('conway','COCA COLA ZERO LEMON 50CL PET','LOS',15,NULL),
('conway','COCA COLA ZERO LEMON 50CL PET','TRAY',16,'24 st./tray'),
('conway','COCA COLA ZERO 50CL PET','LOS',17,NULL),
('conway','COCA COLA ZERO 50CL PET','TRAY',18,'24 st./tray'),
('conway','COCA COLA CHERRY 50CL PET','LOS',19,NULL),
('conway','COCA COLA CHERRY 50CL PET','TRAY',20,'24 st./tray'),
('conway','FANTA LEMON 50CL PET','LOS',21,NULL),
('conway','FANTA LEMON 50CL PET','TRAY',22,'24 st./tray'),
('conway','FANTA ORANGE 50CL PET','LOS',23,NULL),
('conway','FANTA ORANGE 50CL PET','TRAY',24,'24 st./tray'),
('conway','FANTA EXOTIC','LOS',25,NULL),
('conway','FANTA EXOTIC','TRAY',26,'24 st./tray'),
('conway','FANTA Z. FOR BERRIES','LOS',27,NULL),
('conway','FANTA Z. FOR BERRIES','TRAY',28,'24 st./tray'),
('conway','FUZE TEA GREEN MANGO 4X40CL','LOS',29,NULL),
('conway','FUZE TEA GREEN MANGO 4X40CL','TRAY',30,'24 st./tray'),
('conway','FUZE TEA GREEN 40CL','LOS',31,NULL),
('conway','FUZE TEA GREEN 40CL','TRAY',32,'24 st./tray'),
('conway','FUZE TEA PEACH HIBIS 4X40CL','LOS',33,NULL),
('conway','FUZE TEA PEACH HIBIS 4X40CL','TRAY',34,'24 st./tray'),
('conway','FUZE TEA BL. PEACH 4X40CL','LOS',35,NULL),
('conway','FUZE TEA BL. PEACH 4X40CL','TRAY',36,'24 st./tray'),
('conway','FUZE TEA RASPB MINT 4X40CL','LOS',37,NULL),
('conway','FUZE TEA RASPB MINT 4X40CL','TRAY',38,'24 st./tray'),
('conway','FUZE TEA SPARKL LEMON 4X40CL','LOS',39,NULL),
('conway','FUZE TEA SPARKL LEMON 4X40CL','TRAY',40,'24 st./tray'),
('conway','SPRITE 50CL','LOS',41,NULL),
('conway','SPRITE 50CL','TRAY',42,'24 st./tray'),
('conway','MONSTER ENERGY 50CL','LOS',43,NULL),
('conway','MONSTER ENERGY 50CL','TRAY',44,'24 st./tray'),
('conway','MONSTER JUICE MANGO LOCO 50CL','LOS',45,NULL),
('conway','MONSTER JUICE MANGO LOCO 50CL','TRAY',46,'24 st./tray'),
('conway','MONSTER ULTRA WHITE 50CL','LOS',47,NULL),
('conway','MONSTER ULTRA WHITE 50CL','TRAY',48,'24 st./tray'),
('conway','POWERADE MOUNTAIN B. 50CL','LOS',49,NULL),
('conway','POWERADE MOUNTAIN B. 50CL','TRAY',50,'24 st./tray'),
('conway','NALU ORIGINAL 25CL','LOS',51,NULL),
('conway','NALU ORIGINAL 25CL','TRAY',52,'24 st./tray'),
('conway','LEFFE BLONDE 0,0% 33CL','LOS',53,NULL),
('conway','LEFFE BLONDE 0,0% 33CL','TRAY',54,'24 st./tray, of 6 st./pak'),
('conway','VEDETTE EXTRA 0,0% 25CL','LOS',55,NULL),
('conway','VEDETTE EXTRA 0,0% 25CL','TRAY',56,'24 st./tray, of 6 st./pak'),
('conway','VEDETTE E. BLOND 33CL 5,2%','LOS',57,NULL),
('conway','VEDETTE E. BLOND 33CL 5,2%','TRAY',58,'24 st./tray, of 6 st./pak'),
('conway','LIEFMANS 0,0% 25CL','LOS',59,NULL),
('conway','LIEFMANS 0,0% 25CL','TRAY',60,'24 st./tray, of 4 st./pak'),
('conway','DUVEL 666 33CL','LOS',61,NULL),
('conway','DUVEL 666 33CL','TRAY',62,'24 st./tray');
