const models = require("../models");
const nftUtils = require("../utils/nft.utils");
const errorMsg = require("../message/msg_error");
const infoMsg = require("../message/msg_info");
const verifyUtils = require("../utils/verify");
const { Op } = require("sequelize");
const logger = require("../config/logger");

exports.mergeAnimal = async function (req, res, next) {
	const { animalId1, animalId2, color, tokenURL } = req.body;
	if (animalId1 === undefined || animalId2 === undefined) {
		return res.status(400).send(errorMsg.needParameter);
	}
	try {
		// NFT가 아니고, 두가지 속성중 무작위 하나 선택
		let animals = await models.animal_possession.findAll({
			where: { [Op.or]: [{ id: animalId1 }, { id: animalId2 }] },
		});

		let user_wallet = await models.user.findOne({ where: { id: req.userId } });
		console.log(user_wallet.wallet_address);

		function randomVal() {
			return Math.round(Math.random());
		}
		let new_animal = {
			name: animals[randomVal()].name,
			tier: animals[randomVal()].tier,
			user_id: req.userId,
			color: color,
			animal_id: animals[randomVal()].animal_id,
			head_item_id: animals[randomVal()].head_item_id,
			body_item_id: animals[randomVal()].body_item_id,
			foot_item_id: animals[randomVal()].foot_item_id,
			pattern_id: animals[randomVal()].pattern_id,
		};

		let nftMintResult = await nftUtils.getNft(title = 'Bluehat Animal', symbol = 'Bluehat',tokenURL, toAddr = user_wallet.wallet_address);
		console.log(nftMintResult);
		new_animal['nft_hash'] = nftMintResult.transactionHash;

		let new_animals = await models.animal_possession.create(new_animal);

		await models.animal_possession
			.destroy({
				where: { [Op.or]: [{ id: animalId1 }, { id: animalId2 }] },
			})
			.then(console.log("merge success"));

		return res.status(200).send(new_animals);

	} catch (e) {
		console.log(e);
		return res.status(500).send(errorMsg.internalServerError);
	}
};


exports.getUserNftAnimal = async function (req, res, next) {
	logger.info(`${req.method} ${req.url}`);

	// Setting Default
	if (!req.query.page) {
		req.query.page = 1;
	}
	if (!req.query.limit) {
		req.query.limit = 20;
	}

	const offset = (parseInt(req.query.page) - 1) * parseInt(req.query.limit);
	const limit = parseInt(req.query.limit);

	orderInfo = {
		Recently: ["createdAt", "DESC"],
		Oldest: ["createdAt", "ASC"],
		PriceLow: ["price", "ASC"],
		PriceHigh: ["price", "DESC"],
	};

	if (!req.query.order) {
		req.query.order = orderInfo["Recently"];
	} else {
		if (!orderInfo[req.query.order]) {
			req.query.order = orderInfo["Recently"];
		} else {
			req.query.order = orderInfo[req.query.order];
		}
	}
	const order = req.query.order;

	try {
		let allAnimal = await models.animal_possession.findAll({
			where : { user_id: req.userId, nft_hash : {[Op.ne] : null} },
			limit: limit,
			offset: offset,
			order: [order],
			raw: true,
		});
		return res.status(200).send(allAnimal);
	} catch (e) {
		logger.error(e);
		return res.status(500).send(errorMsg.internalServerError);
	}


}

exports.getUserNftAnimalCount = async function (req, res, next) {
	logger.info(`${req.method} ${req.url}`);
	try {
		let count = await models.animal_possession.count({ where: { user_id: req.userId, nft_hash : { [Op.ne] : null} } });
		result = {
			"status": "success",
			"data": {
				"totalCount": count
			}
		}
		return res.status(200).send(result);
	} catch (e) {
		logger.error(e);
		return  res.status(500).send(errorMsg.internalServerError);
	}
}

exports.getUserNftAnimalById = async function (req, res, next) {
	logger.info(`${req.method} ${req.url}`);
	if (!req.params.id) {
		return res.status(400).send(errorMsg.needParameter);
	}
	try {
		let possessionInfo = await models.animal_possession.findOne({
			where: { id: req.params.id },
			attributes: ["id", "nft_hash", "color", "name", "tier", "animal_id", "head_item_id", "body_item_id", "foot_item_id",
			"foot_item_id", "pattern_id", "createdAt", "updatedAt"]
		});
		if (!possessionInfo) {
			return res.status(400).send({"status" : "fail", "msg": "No animal existed"});
		}
		return res.status(200).send(possessionInfo);
		} catch (e) {
			logger.error(e);
			return res.status(500).send(errorMsg.internalServerError);
		}
	
}

exports.getMetaData = async function (req, res, next) {
	logger.info(`${req.method} ${req.url}`);
	if (!req.params.id) {
		return res.status(400).send(errorMsg.needParameter);
	}
	let result = {"image":"https://themetakongz.com/kongz/images/3091.png","description":"The Kongz are unique and randomly generated 3D NFT PFP. Not only that, Kongz can make coins and can breed baby Kongz. Welcome to join us the Kongz society.","name":"Kongz#3091","attributes":[{"display_type":"date","trait_type":"Birthday","value":"1639229527"},{"trait_type":"Feather","value":"None"},{"trait_type":"Lips","value":"Bit"},{"trait_type":"Necklace","value":"Ribbon_Y"},{"trait_type":"Glasses","value":"None"},{"trait_type":"Accessories2","value":"None"},{"trait_type":"Accessories1","value":"None"},{"trait_type":"Cap","value":"Cap_GR"},{"trait_type":"Clothes","value":"Training_blue"},{"trait_type":"Face","value":"Open mouth"},{"trait_type":"Body","value":"Leopard"},{"trait_type":"Wing","value":"Green bear"},{"trait_type":"Background","value":"Yellow"}]}
	return res.status(200).send(result);
}