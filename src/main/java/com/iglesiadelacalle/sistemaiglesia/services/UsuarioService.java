package com.iglesiadelacalle.sistemaiglesia.services;

import java.time.LocalDate;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.iglesiadelacalle.sistemaiglesia.models.Persona;
import com.iglesiadelacalle.sistemaiglesia.models.Usuario;
import com.iglesiadelacalle.sistemaiglesia.repository.PersonaRepository;
import com.iglesiadelacalle.sistemaiglesia.repository.PromocionRepository;
import com.iglesiadelacalle.sistemaiglesia.repository.RolRepository;
import com.iglesiadelacalle.sistemaiglesia.repository.UsuarioRepository;

@Service
public class UsuarioService {

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private PersonaRepository personaRepository;
    @Autowired private RolRepository rolRepository;
    @Autowired private PromocionRepository promocionRepository;

    public Usuario registrarUsuarioCompleto(Integer cedula, String correo, String nombreUser, String password) {
        
        // 1. Verificamos que el Admin ya haya creado a esta persona
        Persona persona = personaRepository.findByCedula(cedula)
            .orElseThrow(() -> new RuntimeException("No existe ninguna persona registrada con la cédula " + cedula));

        // 🛡️ 2. VALIDACIONES DE SEGURIDAD ESTRICTA 🛡️
        if (usuarioRepository.existsByPersona_Cedula(cedula)) {
            throw new RuntimeException("Esta cédula ya tiene una cuenta de usuario registrada.");
        }
        if (usuarioRepository.existsByCorreo(correo)) {
            throw new RuntimeException("El correo electrónico ya está en uso.");
        }
        if (usuarioRepository.existsByNombreUser(nombreUser)) {
            throw new RuntimeException("El nombre de usuario ya está ocupado.");
        }

        // 3. Le creamos sus credenciales de acceso web
        Usuario nuevoUsuario = new Usuario();
        nuevoUsuario.setPersona(persona);
        nuevoUsuario.setCorreo(correo);
        nuevoUsuario.setNombreUser(nombreUser);
        nuevoUsuario.setPasswork(password);
        nuevoUsuario.setEstado("Activo"); 
        nuevoUsuario.setCorreoVerificado("S");
        
        return usuarioRepository.save(nuevoUsuario);
    }

    // ⚡ MÉTODOS PARA EL TIEMPO REAL ⚡
    public boolean existeUsuario(String username) { return usuarioRepository.existsByNombreUser(username); }
    public boolean existeCorreo(String correo) { return usuarioRepository.existsByCorreo(correo); }
    public boolean existeCedulaUsuario(Integer cedula) { return usuarioRepository.existsByPersona_Cedula(cedula); }
}