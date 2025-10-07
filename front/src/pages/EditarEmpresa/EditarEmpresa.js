// src/pages/EditarEmpresa/EditarEmpresa.js
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Menu from '../../components/Menu/Menu';
import { Form, Button, Container, Card, Alert, Modal } from 'react-bootstrap';
import { FaBuilding, FaIdCard, FaEnvelope, FaHome, FaHashtag } from 'react-icons/fa';
import './EditarEmpresa.css';

// Função para validar o CNPJ
const validarCNPJ = (cnpj) => {
    cnpj = cnpj.replace(/[^\d]+/g, '');

    if (cnpj === '') return false;
    if (cnpj.length !== 14) return false;

    // Elimina CNPJs invalidos conhecidos
    if (/^(\d)\1+$/.test(cnpj)) return false;

    // Valida DVs
    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    let digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }
    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado != digitos.charAt(0)) return false;

    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }
    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado != digitos.charAt(1)) return false;

    return true;
};


const EditarEmpresa = () => {
    const { idEmpresa } = useParams();
    const navigate = useNavigate();

    const [empresa, setEmpresa] = useState({
        NOME_EMPRESA: '',
        CNPJ: '',
        EMAIL: '',
        ENDERECO: '',
        NUMERO: '',
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    
    // Estado para controlar a validade do CNPJ
    const [isCnpjValid, setIsCnpjValid] = useState(true);


    const empresaSelecionada = useMemo(
        () => JSON.parse(localStorage.getItem('empresaSelecionada') || 'null'),
        []
    );
    const isAdmin = empresaSelecionada?.NIVEL === 1;

    useEffect(() => {
        const fetchEmpresaData = async () => {
            try {
                const response = await api.get(`/empresas/detalhes/${idEmpresa}`);
                setEmpresa(response.data);
                // Valida o CNPJ que veio do banco de dados ao carregar
                if (response.data.CNPJ) {
                    setIsCnpjValid(validarCNPJ(response.data.CNPJ));
                }
            } catch (err) {
                setError('Não foi possível carregar os dados da empresa. Tente novamente mais tarde.');
            } finally {
                setLoading(false);
            }
        };
        fetchEmpresaData();
    }, [idEmpresa]);

    // handleChange agora valida o CNPJ
    const handleChange = (e) => {
        const { name, value } = e.target;
        
        let finalValue = value;
        if (name === 'CNPJ') {
            // Permite apenas números no campo CNPJ
            finalValue = value.replace(/\D/g, '');
            setIsCnpjValid(validarCNPJ(finalValue));
        }

        setEmpresa(prevState => ({
            ...prevState,
            [name]: finalValue
        }));
    };

    // handleSubmit agora verifica se o CNPJ é válido antes de abrir o modal
    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!isCnpjValid) {
            setError("O CNPJ informado não é válido. Por favor, corrija antes de salvar.");
            return;
        }
        setError(""); // Limpa o erro se o CNPJ for válido

        if (isAdmin) {
            setShowConfirmModal(true);
        }
    };

    const handleConfirmSave = async () => {
        setShowConfirmModal(false);
        setError('');
        setSuccess('');

        try {
            await api.put(`/empresas/detalhes/${idEmpresa}`, empresa);
            setSuccess('Dados da empresa atualizados com sucesso!');
            setTimeout(() => navigate('/home'), 2000);
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Erro ao atualizar os dados. Verifique as informações e tente novamente.';
            setError(errorMsg);
        }
    };

    if (loading) {
        return (
            <div className="editar-empresa-container">
                <Menu />
                <Container as="main" className="editar-empresa-main-content">
                    <p>Carregando...</p>
                </Container>
            </div>
        );
    }

    return (
        <>
            <div className="editar-empresa-container">
                <Menu />
                <Container as="main" className="editar-empresa-main-content">
                    <h1 className="mb-4">Dados da Empresa</h1>
                    <Card>
                        <Card.Body>
                            {!isAdmin && (
                                <Alert variant="info">
                                    Você está em modo de visualização. Apenas administradores podem editar estas informações.
                                </Alert>
                            )}
                            {error && <Alert variant="danger">{error}</Alert>}
                            {success && <Alert variant="success">{success}</Alert>}

                            <Form onSubmit={handleSubmit} noValidate>
                                <Form.Group className="mb-3">
                                    <Form.Label>Nome da Empresa</Form.Label>
                                    <div className="form-group-with-icon">
                                        <FaBuilding className="form-icon" />
                                        <Form.Control type="text" name="NOME_EMPRESA" value={empresa.NOME_EMPRESA || ''} onChange={handleChange} disabled={!isAdmin} required />
                                    </div>
                                </Form.Group>
                                
                                <Form.Group className="mb-3">
                                    <Form.Label>CNPJ</Form.Label>
                                    <div className="form-group-with-icon">
                                        <FaIdCard className="form-icon" />
                                        <Form.Control
                                            type="text"
                                            name="CNPJ"
                                            value={empresa.CNPJ || ''}
                                            onChange={handleChange}
                                            disabled={!isAdmin}
                                            required
                                            maxLength={14}
                                            isInvalid={!isCnpjValid && empresa.CNPJ.length > 0}
                                        />
                                    </div>
                                    {!isCnpjValid && empresa.CNPJ.length > 0 && (
                                        <Form.Text className="text-danger">
                                            CNPJ inválido.
                                        </Form.Text>
                                    )}
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Email</Form.Label>
                                    <div className="form-group-with-icon">
                                        <FaEnvelope className="form-icon" />
                                        <Form.Control type="email" name="EMAIL" value={empresa.EMAIL || ''} onChange={handleChange} disabled={!isAdmin} />
                                    </div>
                                </Form.Group>

                                <div className="form-row">
                                    <Form.Group className="mb-3 form-group-endereco">
                                        <Form.Label>Endereço</Form.Label>
                                        <div className="form-group-with-icon">
                                            <FaHome className="form-icon" />
                                            <Form.Control type="text" name="ENDERECO" value={empresa.ENDERECO || ''} onChange={handleChange} disabled={!isAdmin} />
                                        </div>
                                    </Form.Group>
                                    <Form.Group className="mb-3 form-group-numero">
                                        <Form.Label>Número</Form.Label>
                                        <div className="form-group-with-icon">
                                            <FaHashtag className="form-icon" />
                                            <Form.Control type="text" name="NUMERO" value={empresa.NUMERO || ''} onChange={handleChange} disabled={!isAdmin} />
                                        </div>
                                    </Form.Group>
                                </div>
                                
                                {isAdmin && (
                                    <Button variant="primary" type="submit" className="mt-2">
                                        Salvar Alterações
                                    </Button>
                                )}
                            </Form>
                        </Card.Body>
                    </Card>
                </Container>
            </div>

            <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Confirmar Alterações</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Você tem certeza de que deseja salvar as alterações nas informações da empresa?
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
                        Cancelar
                    </Button>
                    <Button variant="primary" onClick={handleConfirmSave}>
                        Sim, Salvar
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default EditarEmpresa;